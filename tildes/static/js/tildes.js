// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$(function() {
    $.onmount();

    // Add the CSRF token to all Intercooler AJAX requests as a header
    /* eslint-disable-next-line no-unused-vars */
    $(document).on("beforeAjaxSend.ic", function(event, ajaxSetup, elt) {
        var token = $("meta[name='csrftoken']").attr("content");
        ajaxSetup.headers["X-CSRF-Token"] = token;

        // This is pretty ugly - adds an X-IC-Trigger-Name header for DELETE
        // requests since the POST params are not accessible
        if (ajaxSetup.headers["X-HTTP-Method-Override"] === "DELETE") {
            var re = /ic-trigger-name=(\S+?)(&|$)/;
            var match = re.exec(ajaxSetup.data);
            if (match && match.length > 1) {
                ajaxSetup.headers["X-IC-Trigger-Name"] = match[1];
            }
        }
    });

    // Automatically call onmount whenever Intercooler swaps in new content
    Intercooler.ready(function() {
        $.onmount();
    });

    // Called whenever an Intercooler request completes; used for <form> elements
    // to display the error or a success message.
    // If the triggering element already contains an element with class
    // "form-status", it will be removed, then a new one is added inside the
    // .form-buttons element if possible, otherwise it will be appended to the
    // triggering element itself. The status div will then have its class set based
    // on whether the response was an error or not, and the text set to either the
    // error message or a generic success message.
    /* eslint-disable-next-line no-unused-vars */
    $(document).on("complete.ic", function(evt, elt, data, status, xhr, requestId) {
        // only do anything for <form> elements
        if (elt[0].tagName !== "FORM") {
            return;
        }

        // see if a status element already exists and remove it
        $(elt)
            .find(".form-status")
            .remove();

        // add a new one (inside .form-buttons if possible)
        var statusDiv = '<div class="form-status"></div>';

        var $buttonElement = $(elt)
            .find(".form-buttons")
            .first();
        if ($buttonElement.length) {
            $buttonElement.append(statusDiv);
        } else {
            $(elt).append(statusDiv);
        }
        var $statusElement = $(elt)
            .find(".form-status")
            .first();

        // set the class and text, then fade in
        $statusElement.hide();
        if (status === "success") {
            $statusElement.addClass("form-status-success").text("Saved successfully");
        } else {
            var errorText = xhr.responseText;
            if (xhr.status === 413) {
                errorText = "Too much data submitted";
            }

            // check if the response came back as HTML (unhandled error of some sort)
            if (errorText.lastIndexOf("<html>", 500) !== -1) {
                errorText = "Unknown error";
            }

            $statusElement.addClass("form-status-error").text(errorText);
        }
        $statusElement.fadeIn("slow");
    });
});

// Create a namespacing object to hold functions
if (!window.Tildes) {
    window.Tildes = {};
}

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-auto-focus]", function() {
    var $input = $(this);

    // just calling .focus() will place the cursor at the start of the field,
    // so un-setting and re-setting the value moves the cursor to the end
    var original_val = $input.val();
    $input
        .focus()
        .val("")
        .val(original_val);
});

// Copyright (c) 2019 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-autocomplete-chip-clear]", function() {
    function clearChip($chip) {
        var $tagsHiddenInput = $("[data-js-autocomplete-hidden-input]");
        var $autocompleteInput = $("[data-js-autocomplete-input]");

        var textToReplace = new RegExp($chip.text() + ",");
        $tagsHiddenInput.val($tagsHiddenInput.val().replace(textToReplace, ""));
        $chip.remove();
        $autocompleteInput.focus();
    }

    $(this).click(function(event) {
        event.preventDefault();
        clearChip($(this).parent());
    });

    $(this).keydown(function(event) {
        switch (event.key) {
            case "Backspace":
                event.preventDefault();
                clearChip($(this).parent());
                break;
            default:
                break;
        }
    });
});

// Copyright (c) 2019 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-autocomplete-input]", function() {
    function addChip($input) {
        var $autocompleteContainer = $input
            .parents("[data-js-autocomplete-container]")
            .first();
        var $chips = $autocompleteContainer
            .find("[data-js-autocomplete-chips]")
            .first();
        var $tagsHiddenInput = $("[data-js-autocomplete-hidden-input]");

        $input
            .val()
            .split(",")
            .map(function(tag) {
                return tag.trim();
            })
            .filter(function(tag) {
                return tag !== "";
            })
            .forEach(function(tag) {
                if (!$tagsHiddenInput.val().match(new RegExp("(^|,)" + tag + ","))) {
                    var clearIcon = document.createElement("a");
                    clearIcon.classList.add("btn");
                    clearIcon.classList.add("btn-clear");
                    clearIcon.setAttribute("data-js-autocomplete-chip-clear", "");
                    clearIcon.setAttribute("aria-label", "Close");
                    clearIcon.setAttribute("role", "button");
                    clearIcon.setAttribute("tabindex", $chips.children().length);

                    var $chip = $(document.createElement("div"));
                    $chip.addClass("chip");
                    $chip.html(tag);
                    $chip.append(clearIcon);

                    $chips.append($chip);

                    $tagsHiddenInput.val($tagsHiddenInput.val() + tag + ",");
                }
            });
        $autocompleteContainer.find("[data-js-autocomplete-input]").val("");
        $autocompleteContainer.find("[data-js-autocomplete-suggestions]").html("");

        $.onmount();
    }

    // initialization (won't repeat on re-mounts because it removes the name attr)
    if ($(this).attr("name")) {
        // move the "tags" name to the hidden input (so the form works without JS)
        $(this).removeAttr("name");
        $("[data-js-autocomplete-hidden-input]").attr("name", "tags");

        // attach an event handler to the form that will add the input's value to
        // the end of the tags list before submitting (to include any tag that's
        // still in the input and wasn't converted to a chip)
        $(this)
            .closest("form")
            /* eslint-disable-next-line no-unused-vars */
            .on("beforeSend.ic", function(evt, elt, data, settings, xhr, requestId) {
                var $autocompleteInput = $(elt)
                    .find("[data-js-autocomplete-input]")
                    .first();
                if (!$autocompleteInput.val()) {
                    return;
                }

                var dataPieces = settings.data.split("&");
                for (var i = 0; i < dataPieces.length; i++) {
                    if (dataPieces[i].indexOf("tags=") === 0) {
                        dataPieces[i] += $autocompleteInput.val();
                        $autocompleteInput.val("");
                        break;
                    }
                }
                settings.data = dataPieces.join("&");
            });
    }

    if ($(this).val() !== "") {
        addChip($(this));
    }

    $(this).focus(function() {
        var $autocompleteContainer = $(this)
            .parents("[data-js-autocomplete-container]")
            .first();
        var $chips = $autocompleteContainer
            .find("[data-js-autocomplete-chips]")
            .first();

        $chips.children().removeClass("active");
    });

    $(this).keydown(function(event) {
        var $autocompleteMenu = $("[data-js-autocomplete-menu]").first();
        var $nextActiveItem = null;

        switch (event.key) {
            case "Escape":
                $("[data-js-autocomplete-menu]").remove();
                $(this).blur();
                break;
            case ",":
            case "Enter":
                event.preventDefault();
                addChip($(this));
                break;
            case "ArrowDown":
                event.preventDefault();
                $nextActiveItem = $autocompleteMenu.children(".menu-item").first();
                $nextActiveItem
                    .children("[data-js-autocomplete-menu-item]")
                    .first()
                    .focus();
                break;
            case "ArrowUp":
                event.preventDefault();
                $nextActiveItem = $autocompleteMenu.children(".menu-item").last();
                $nextActiveItem
                    .children("[data-js-autocomplete-menu-item]")
                    .first()
                    .focus();
                break;
            case "Backspace":
                if ($(this).val() === "") {
                    event.preventDefault();
                    var $autocompleteContainer = $(this)
                        .parents("[data-js-autocomplete-container]")
                        .first();
                    var $chips = $autocompleteContainer
                        .find("[data-js-autocomplete-chips]")
                        .first();
                    var $lastChip = $chips.children().last();

                    if ($lastChip.length) {
                        $(this).blur();
                        if (!$lastChip.hasClass("active")) {
                            $lastChip.addClass("active");
                            $lastChip
                                .children("[data-js-autocomplete-chip-clear]")
                                .first()
                                .focus();
                        }
                    }
                }
                break;
        }
    });

    $(this).keyup(function() {
        var $this = $(this);
        var $autocompleteMenu = $("[data-js-autocomplete-menu]");
        if ($autocompleteMenu) {
            $autocompleteMenu.remove();
        }
        if ($this.val() === "") {
            return;
        }
        var $tagsHiddenInput = $("[data-js-autocomplete-hidden-input]");
        var suggestions = $this
            .data("js-autocomplete-input")
            .filter(function(suggestion) {
                return (
                    suggestion.startsWith($this.val().toLowerCase()) &&
                    !$tagsHiddenInput
                        .val()
                        .match(new RegExp("(^|,)" + suggestion + ","))
                );
            });
        if (suggestions.length === 0) {
            return;
        }
        var $autocompleteSuggestions = $("[data-js-autocomplete-suggestions]");
        $autocompleteMenu = $('<ol class="menu" data-js-autocomplete-menu>');

        suggestions.forEach(function(suggestion) {
            $autocompleteMenu.append(
                '<li class="menu-item">' +
                    '<a href="#" data-js-autocomplete-menu-item>' +
                    '<div class="tile tile-centered">' +
                    '<div class="tile-content">' +
                    suggestion +
                    "</div>" +
                    "</div>" +
                    "</a>" +
                    "</li>"
            );
        });
        $autocompleteSuggestions.append($autocompleteMenu);
        $.onmount();
    });
});

// Copyright (c) 2019 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-autocomplete-menu-item]", function() {
    function addChip($menuItem) {
        var $autocompleteContainer = $menuItem
            .parents("[data-js-autocomplete-container]")
            .first();
        var $clickedSuggestion = $menuItem.find(".tile > .tile-content").first();
        var clickedSuggestionText = $clickedSuggestion.html().trim();
        var $tagsHiddenInput = $("[data-js-autocomplete-hidden-input]");
        var $autocompleteInput = $("[data-js-autocomplete-input]");

        if (!$tagsHiddenInput.val().includes(clickedSuggestionText + ",")) {
            var $chips = $autocompleteContainer
                .find("[data-js-autocomplete-chips]")
                .first();

            var clearIcon = document.createElement("a");
            clearIcon.classList.add("btn");
            clearIcon.classList.add("btn-clear");
            clearIcon.setAttribute("data-js-autocomplete-chip-clear", "");
            clearIcon.setAttribute("aria-label", "Close");
            clearIcon.setAttribute("role", "button");
            clearIcon.setAttribute("tabindex", $chips.children().length);

            var $chip = $(document.createElement("div"));
            $chip.addClass("chip");
            $chip.html(clickedSuggestionText);
            $chip.append(clearIcon);

            $chips.append($chip);

            $tagsHiddenInput.val($tagsHiddenInput.val() + clickedSuggestionText + ",");
        }

        $autocompleteContainer.find("[data-js-autocomplete-input]").val("");
        $autocompleteContainer.find("[data-js-autocomplete-suggestions]").html("");
        $autocompleteInput.focus();

        $.onmount();
    }

    $(this).click(function(event) {
        event.preventDefault();
        addChip($(this), event);
    });

    $(this).keydown(function(event) {
        var $nextActiveItem = null;
        switch (event.key) {
            case "Escape":
                $("[data-js-autocomplete-menu]")
                    .parent()
                    .remove();
                break;
            case "Enter":
                event.preventDefault();
                addChip($(this));
                break;
            case "ArrowDown":
                event.preventDefault();
                $nextActiveItem = $(this)
                    .parent()
                    .next();
                $nextActiveItem
                    .children("[data-js-autocomplete-menu-item]")
                    .first()
                    .focus();
                break;
            case "ArrowUp":
                event.preventDefault();
                $nextActiveItem = $(this)
                    .parent()
                    .prev();
                $nextActiveItem
                    .children("[data-js-autocomplete-menu-item]")
                    .first()
                    .focus();
                break;
            default:
                break;
        }
    });
});

// Copyright (c) 2019 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-autocomplete-menu]", function() {
    var $autocompleteContainer = $(this)
        .parents("[data-js-autocomplete-container]")
        .first();
    var $chips = $autocompleteContainer.find("[data-js-autocomplete-chips]").first();

    $(this)
        .children("[data-js-autocomplete-menu-item]")
        .each(function(index, $menuItem) {
            $menuItem.setAttribute("tabindex", $chips.children().length + index);
        });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-autoselect-input]", function() {
    $(this).click(function() {
        $(this).select();
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-autosubmit-on-change]", function() {
    $(this).change(function() {
        $(this)
            .closest("form")
            .submit();
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-cancel-button]", function() {
    $(this).click(function() {
        var $parentForm = $(this).closest("form");

        var shouldRemove = true;

        // confirm removal if the form specifies to
        var confirmPrompt = $parentForm.attr("data-js-confirm-cancel");
        if (confirmPrompt) {
            // only prompt if any of the inputs aren't empty
            var $nonEmptyFields = $parentForm.find("input,textarea").filter(function() {
                return $(this).val();
            });

            if ($nonEmptyFields.length > 0) {
                shouldRemove = window.confirm(confirmPrompt);
            } else {
                shouldRemove = true;
            }
        }

        if (shouldRemove) {
            $(this)
                .closest("form")
                .remove();
        }
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-comment-collapse-all-button]", function() {
    $(this).click(function() {
        // first uncollapse any individually collapsed comments
        $(".is-comment-collapsed-individual").each(function(idx, child) {
            $(child)
                .find("[data-js-comment-collapse-button]:first")
                .trigger("click");
        });

        // then collapse all first-level replies
        $('.comment[data-comment-depth="1"]:not(.is-comment-collapsed)').each(function(
            idx,
            child
        ) {
            $(child)
                .find("[data-js-comment-collapse-button]:first")
                .trigger("click");
        });

        $(this).blur();
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-comment-collapse-button]", function() {
    $(this).click(function() {
        var $this = $(this);
        var $comment = $this.closest(".comment");

        // if the comment is individually collapsed, just remove that class,
        // otherwise toggle the collapsed state
        if ($comment.hasClass("is-comment-collapsed-individual")) {
            $comment.removeClass("is-comment-collapsed-individual");
        } else {
            $comment.toggleClass("is-comment-collapsed");
        }

        if ($comment.hasClass("is-comment-collapsed")) {
            $this.text("+");
        } else {
            $this.html("&minus;");
        }

        $this.blur();
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-comment-expand-all-button]", function() {
    $(this).click(function() {
        $(".is-comment-collapsed, .is-comment-collapsed-individual").each(function(
            idx,
            child
        ) {
            $(child)
                .find("[data-js-comment-collapse-button]:first")
                .trigger("click");
        });

        $(this).blur();
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-comment-label-button]", function() {
    $(this).click(function(event) {
        event.preventDefault();

        var $comment = $(this)
            .parents(".comment")
            .first();
        var userLabels = $comment.attr("data-comment-user-labels");

        // check if the label button div already exists and just remove it if so
        var $labelButtons = $comment
            .find(".comment-itself:first")
            .find(".comment-label-buttons");
        if ($labelButtons.length > 0) {
            $labelButtons.remove();
            return;
        }

        var commentID = $comment.attr("data-comment-id36");
        var labelURL = "/api/web/comments/" + commentID + "/labels/";

        var labeltemplate = document.querySelector("#comment-label-options");
        var clone = document.importNode(labeltemplate.content, true);
        var options = clone.querySelectorAll("a");

        for (var i = 0; i < options.length; i++) {
            var label = options[i];
            var labelName = label.getAttribute("data-js-label-name");

            var labelOptionActive = false;
            if (userLabels.indexOf(labelName) !== -1) {
                labelOptionActive = true;
            }

            var labelPrompt = label.getAttribute("data-js-reason-prompt");

            if (labelOptionActive) {
                label.className += " btn btn-used";
                label.setAttribute("data-ic-delete-from", labelURL + labelName);

                // if the label requires a prompt, confirm that they want to remove it
                // (since we don't want to accidentally lose the reason they typed in)
                if (labelPrompt) {
                    label.setAttribute(
                        "data-ic-confirm",
                        "Remove your " + labelName + " label?"
                    );
                }

                $(label).on("after.success.ic", function(evt) {
                    var labelName = evt.target.getAttribute("data-js-label-name");
                    Tildes.removeUserLabel(commentID, labelName);
                });
            } else {
                label.setAttribute("data-ic-put-to", labelURL + labelName);

                if (labelPrompt) {
                    label.setAttribute("data-ic-prompt", labelPrompt);
                    label.setAttribute("data-ic-prompt-name", "reason");
                }

                $(label).on("after.success.ic", function(evt) {
                    var labelName = evt.target.getAttribute("data-js-label-name");
                    Tildes.addUserLabel(commentID, labelName);

                    // if the applied label was Exemplary, remove the button from the
                    // template since they can't use it again anyway
                    if (labelName === "exemplary") {
                        var exemplaryButton = labeltemplate.content.querySelector(
                            ".btn-comment-label-exemplary"
                        );
                        if (exemplaryButton) {
                            exemplaryButton.parentElement.remove();
                        }
                    }
                });
            }

            label.setAttribute(
                "data-ic-target",
                "#comment-" + commentID + " .comment-itself:first"
            );
        }

        // update Intercooler so it knows about these new elements
        Intercooler.processNodes(clone);

        $comment
            .find(".btn-post")
            .first()
            .after(clone);
    });
});

Tildes.removeUserLabel = function(commentID, labelName) {
    var $comment = $("#comment-" + commentID);
    var userLabels = $comment.attr("data-comment-user-labels").split(" ");

    // if the label isn't there, don't need to do anything
    var labelIndex = userLabels.indexOf(labelName);
    if (labelIndex === -1) {
        return;
    }

    // remove the label from the list and update the data attr
    userLabels.splice(labelIndex, 1);
    $comment.attr("data-comment-user-labels", userLabels.join(" "));
};

Tildes.addUserLabel = function(commentID, labelName) {
    var $comment = $("#comment-" + commentID);
    var userLabels = $comment.attr("data-comment-user-labels").split(" ");

    // don't add the label again if it's already there
    var labelIndex = userLabels.indexOf(labelName);
    if (labelIndex !== -1) {
        return;
    }

    // add the label to the list and update the data attr
    userLabels.push(labelName);
    $comment.attr("data-comment-user-labels", userLabels.join(" "));
};

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-comment-parent-button]", function() {
    $(this).click(function() {
        var $comment = $(this)
            .parents(".comment")
            .first();
        var $parentComment = $comment.parents(".comment").first();

        var backButton = document.createElement("a");
        backButton.setAttribute(
            "href",
            "#comment-" + $comment.attr("data-comment-id36")
        );
        backButton.setAttribute("class", "comment-nav-link");
        backButton.setAttribute("data-js-comment-back-button", "");
        backButton.setAttribute("data-js-remove-on-click", "");
        backButton.innerHTML = "[Back]";

        var $parentHeader = $parentComment.find("header").first();

        // remove any existing back button
        $parentHeader.find("[data-js-comment-back-button]").remove();

        $parentHeader.append(backButton);
        $.onmount();
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-comment-reply-button]", function() {
    $(this).click(function(event) {
        event.preventDefault();

        // disable click/hover events on the reply button
        $(this).css("pointer-events", "none");

        var $comment = $(this)
            .parents(".comment")
            .first();

        // get the replies list, or create one if it doesn't already exist
        var $replies = $comment.children(".comment-tree-replies");
        if (!$replies.length) {
            var repliesList = document.createElement("ol");
            repliesList.setAttribute("class", "comment-tree comment-tree-replies");
            $comment.append(repliesList);
            $replies = $(repliesList);
        }

        var $parentComment = $(this).parents("article.comment:first");
        var parentCommentID = $parentComment.attr("data-comment-id36");
        var postURL = "/api/web/comments/" + parentCommentID + "/replies";
        var markdownID = "markdown-reply-" + parentCommentID;
        var previewID = markdownID + "-preview";

        if ($("#" + markdownID).length > 0) {
            $("#" + markdownID).focus();
            return;
        }

        // clone and populate the 'comment-reply' template
        var template = document.getElementById("comment-reply");
        var clone = document.importNode(template.content, true);

        clone.querySelector("form").setAttribute("data-ic-post-to", postURL);
        var textarea = clone.querySelector("textarea");
        textarea.setAttribute("id", markdownID);

        var preview = clone.querySelector(".form-markdown-preview");
        preview.setAttribute("id", previewID);

        clone
            .querySelector("[data-js-markdown-preview-tab] .btn")
            .setAttribute("data-ic-target", "#" + previewID);

        var cancelButton = clone.querySelector("[data-js-cancel-button]");
        $(cancelButton).on("click", function() {
            // re-enable click/hover events on the reply button
            $(this)
                .parents(".comment")
                .first()
                .find(".btn-post-action[name=reply]")
                .first()
                .css("pointer-events", "auto");
        });

        // If the user has text selected inside a comment when they click the reply
        // button, start the comment form off with that text inside a blockquote
        if (window.getSelection) {
            var selectedText = "";

            // only capture the selected text if it's all from the same comment
            var selection = window.getSelection();
            var $start = $(selection.anchorNode).closest(".comment-text");
            var $end = $(selection.focusNode).closest(".comment-text");
            if ($start.is($end)) {
                selectedText = selection.toString();
            }

            if (selectedText.length > 0) {
                selectedText = selectedText.replace(/\s+$/g, "");
                selectedText = selectedText.replace(/^/gm, "> ");
                textarea.value = selectedText + "\n\n";
                textarea.scrollTop = textarea.scrollHeight;
            }
        }

        // update Intercooler so it knows about this new form
        Intercooler.processNodes(clone);

        $replies.prepend(clone);
        $.onmount();
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-confirm-leave-page-unsaved]", function() {
    var $form = $(this);
    $form.areYouSure();

    // Fixes a strange interaction between Intercooler and AreYouSure, where
    // submitting a form by using the keyboard to push the submit button would
    // trigger a confirmation prompt before leaving the page.
    $form.on("success.ic", function() {
        $form.removeClass("dirty");
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-ctrl-enter-submit-form]", function() {
    $(this).keydown(function(event) {
        if (
            (event.ctrlKey || event.metaKey) &&
            (event.keyCode == 13 || event.keyCode == 10)
        ) {
            $(this)
                .closest("form")
                .submit();
        }
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-external-links-new-tabs]", function() {
    // Open external links in topic, comment, and message text in new tabs
    $(this)
        .find("a")
        .each(function() {
            if (this.host !== window.location.host) {
                $(this).attr("target", "_blank");
                $(this).attr("rel", "noopener");
            }
        });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-fadeout-parent-on-success]", function() {
    $(this).on("after.success.ic", function() {
        $(this)
            .parent()
            .fadeOut("fast");
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-hide-sidebar-if-open]", function() {
    $(this).on("click", function(event) {
        if ($("#sidebar").hasClass("is-sidebar-displayed")) {
            event.preventDefault();
            event.stopPropagation();
            $("#sidebar").removeClass("is-sidebar-displayed");
        }
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-hide-sidebar-no-preventdefault]", function() {
    $(this).on("click", function() {
        $("#sidebar").removeClass("is-sidebar-displayed");
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-markdown-edit-tab]", function() {
    $(this).click(function() {
        var $editTextarea = $(this)
            .closest("form")
            .find('[name="markdown"]');
        var $previewDiv = $(this)
            .closest("form")
            .find(".form-markdown-preview");

        $editTextarea.removeClass("d-none");
        $previewDiv.addClass("d-none");
        $previewDiv.empty();
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-markdown-preview-tab]", function() {
    $(this).click(function() {
        var $editTextarea = $(this)
            .closest("form")
            .find('[name="markdown"]');
        var $previewDiv = $(this)
            .closest("form")
            .find(".form-markdown-preview");

        $editTextarea.addClass("d-none");
        $previewDiv.removeClass("d-none");
    });

    $(this).on("after.success.ic success.ic", function(event) {
        // Stop intercooler event from bubbling up past this button. This
        // prevents behaviors on parent elements from mistaking a successful
        // "preview" from a successful "submit".
        event.stopPropagation();
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-prevent-double-submit]", function() {
    /* eslint-disable-next-line no-unused-vars */
    $(this).on("beforeSend.ic", function(evt, elt, data, settings, xhr, requestId) {
        var $form = $(this);

        if ($form.attr("data-js-submitting") !== undefined) {
            xhr.abort();
            return false;
        } else {
            $form.attr("data-js-submitting", true);
        }
    });

    $(this).on("complete.ic", function() {
        $(this).removeAttr("data-js-submitting");
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-remove-on-click]", function() {
    $(this).on("click", function() {
        $(this).remove();
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-remove-on-success]", function() {
    $(this).on("after.success.ic", function() {
        $(this).remove();
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-sidebar-toggle]", function() {
    $(this).click(function(event) {
        event.preventDefault();
        event.stopPropagation();

        $("#sidebar").toggleClass("is-sidebar-displayed");
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-tab]", function() {
    $(this).click(function() {
        $(this)
            .siblings()
            .removeClass("active");
        $(this).addClass("active");
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-theme-selector]", function() {
    $(this).change(function(event) {
        event.preventDefault();

        // hide any IC change message
        $(this)
            .parent()
            .find(".form-status")
            .hide();

        var new_theme = $(this).val();
        var selected_text = $(this)
            .find("option:selected")
            .text();
        var $setDefaultButton = $("#button-set-default-theme");

        // persist the new theme for the user in their cookie
        document.cookie =
            "theme=" +
            new_theme +
            ";" +
            "path=/;max-age=315360000;secure;domain=" +
            document.location.hostname;

        // remove any theme classes currently on the body
        var $body = $("body").first();
        var bodyClasses = $body[0].className.split(" ");
        for (var i = 0; i < bodyClasses.length; i++) {
            var cls = bodyClasses[i];
            if (cls.indexOf("theme-") === 0) {
                $body.removeClass(cls);
            }
        }

        // add the class for the new theme to the body
        $body.addClass("theme-" + new_theme);

        // set visibility of 'Set as account default' button
        if (selected_text.indexOf("account default") === -1) {
            $setDefaultButton.removeClass("d-none");
        } else {
            $setDefaultButton.addClass("d-none");
        }
    });
});

// Copyright (c) 2018 Tildes contributors <code@tildes.net>
// SPDX-License-Identifier: AGPL-3.0-or-later

$.onmount("[data-js-time-period-select]", function() {
    $(this).change(function() {
        var periodValue = this.value;

        if (periodValue === "other") {
            var enteredPeriod = "";
            var validRegex = /^\d+[hd]?$/i;

            // prompt for a time period until they enter a valid one
            while (!validRegex.test(enteredPeriod)) {
                enteredPeriod = prompt(
                    'Enter a custom time period (number of hours, or add a "d" suffix for days):'
                );

                // exit if they specifically cancelled the prompt
                if (enteredPeriod === null) {
                    return false;
                }
            }

            // if it was just a bare number, append "h"
            if (/^\d+$/.test(enteredPeriod)) {
                enteredPeriod += "h";
            }

            // need to add the option to the <select> so it's valid to choose
            $(this).append('<option value="' + enteredPeriod + '">Custom</option>');

            this.value = enteredPeriod;
        }

        this.form.submit();
    });
});

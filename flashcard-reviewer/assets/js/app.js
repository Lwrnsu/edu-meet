
document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // MODAL MANAGEMENT
    // =====================================

    const classModal = document.getElementById("classModal");
    const deckModal = document.getElementById("deckModal");

    function openModal(modal) {
        if (!modal) return;

        closeModal(classModal);
        closeModal(deckModal);

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        const firstInput = modal.querySelector(
            "input:not([type='hidden']), textarea, select"
        );

        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    function closeModal(modal) {
        if (!modal) return;

        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");

        if (
            !classModal?.classList.contains("show") &&
            !deckModal?.classList.contains("show")
        ) {
            document.body.style.overflow = "";
        }
    }

    // Open class modal
    [
        "openClassModal",
        "openClassModal2",
        "emptyCreateClass",
        "emptyCreateClass2",
        "modalCreateClass"
    ].forEach(id => {
        const button = document.getElementById(id);

        if (button) {
            button.addEventListener("click", () => {
                openModal(classModal);
            });
        }
    });

    // Open deck modal
    [
        "openDeckModal",
        "openDeckModal2",
        "emptyCreateDeck"
    ].forEach(id => {
        const button = document.getElementById(id);

        if (button) {
            button.addEventListener("click", () => {
                openModal(deckModal);
            });
        }
    });

    // Close buttons
    document.querySelectorAll("[data-close]").forEach(button => {
        button.addEventListener("click", () => {
            const modal = document.getElementById(
                button.dataset.close
            );

            closeModal(modal);
        });
    });

    // Close when clicking outside modal
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                closeModal(overlay);
            }
        });
    });

    // Escape key
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal(classModal);
            closeModal(deckModal);
        }
    });


    // =====================================
    // SEARCH FUNCTIONALITY
    // =====================================

    const searchInput = document.getElementById("dashboardSearch");

    if (searchInput) {
        searchInput.addEventListener("input", () => {

            const query = searchInput.value
                .trim()
                .toLowerCase();

            const classCards = document.querySelectorAll(".class-card");
            const deckCards = document.querySelectorAll(".deck-card");

            let visibleCount = 0;

            [...classCards, ...deckCards].forEach(card => {

                const content = (
                    card.dataset.search ||
                    card.textContent ||
                    ""
                ).toLowerCase();

                const matches = content.includes(query);

                card.hidden = !matches;

                if (matches) {
                    visibleCount++;
                }
            });

            const emptyMessage = document.getElementById("searchEmpty");

            if (emptyMessage) {
                emptyMessage.hidden = query === "" || visibleCount > 0;
            }
        });
    }


    // =====================================
    // AUTOMATIC ALERT DISMISSAL
    // =====================================

    const alerts = document.querySelectorAll(".alert");

    alerts.forEach(alert => {

        setTimeout(() => {

            alert.style.transition = "opacity 0.4s ease";
            alert.style.opacity = "0";

            setTimeout(() => {
                alert.remove();
            }, 400);

        }, 4000);
    });


    // =====================================
    // FORM SUBMISSION FEEDBACK
    // =====================================

    document.querySelectorAll(".modal form").forEach(form => {

        form.addEventListener("submit", event => {

            if (!form.checkValidity()) {
                event.preventDefault();
                form.reportValidity();
                return;
            }

            const button = form.querySelector(
                'button[type="submit"]'
            );

            if (button) {
                button.disabled = true;
                button.textContent = "Saving...";
            }
        });
    });

});
var theme = "dark";

function mysteryClick(address) {
    let root = document.querySelector(":root")
    root.style.setProperty("--halycon", "#f09d51")
}

function abstractClick(element_id, element_id2 = "None") {
    const hook = document.getElementById(element_id);
    if (element_id2 != "None") {
        const hook2 = document.getElementById(element_id2);
        hook2.style.display = "none";
    }

    if (hook.style.display === "none" || hook.style.display === "") {

        hook.style.display = "block";
    }
    else {
        hook.style.display = "none";
        hook.style.color = "var(--blueBC)";
    }
}

function open_tab(link_url) {
    window.open(link_url, '_blank').focus();
}

function click_buzzword(element_id) {
    let hook = document.getElementById(element_id);
    let all_buzzwords = document.getElementsByClassName("buzzword")

    for (let i = 0; i < all_buzzwords.length; i++) {
        let current_buzzword = document.getElementById(all_buzzwords[i].id);
        if ((current_buzzword.id !== element_id) && (current_buzzword.style.display) !== "none") {
            current_buzzword.style.display = "none";
        }
    }


    if (hook.style.display === "none" || hook.style.display === "") {
        hook.style.display = "flex";
    }
    else {
        hook.style.display = "none";
    }
}

function project_image_click(currentIdPrefix) {
    const parent = document.getElementById(currentIdPrefix).parentElement;
    const images = Array.from(parent.getElementsByClassName("project_image"));

    const currentIndex = images.findIndex(div => div.style.display === "flex" || div.style.display === "block");

    // Hide current
    if (currentIndex >= 0) {
        images[currentIndex].style.display = "none";
    }

    // Show next (loop around)
    const nextIndex = (currentIndex + 1) % images.length;
    images[nextIndex].style.display = "flex";
}

function cycleImage(button, direction) {
    const wrapper = button.closest(".carousel-wrapper");
    const images = Array.from(wrapper.getElementsByClassName("project_image"));

    let currentIndex = images.findIndex(img =>
        img.style.display === "flex" || img.style.display === "block"
    );

    if (currentIndex !== -1) {
        images[currentIndex].style.display = "none";
        const nextIndex = (currentIndex + direction + images.length) % images.length;
        images[nextIndex].style.display = "flex";
    }
}


function click_recent(input_list, title_string) {
    for (let ii = 0; ii < input_list.length; ii++) {
        let hook = document.getElementById(input_list[ii])
        console.log(hook.classList);
        if (!hook.classList.contains("dropdown")) {
            hook.style.display = "block";
            hook.classList.add("dropdown");
        }
        else {
            hook.classList.remove("dropdown");
            hook.style.display = "none";
        }
    }

    let hook = document.getElementById(title_string[0]);
    if (hook.innerText.includes("+")) {
        hook.innerText = "\u2014 " + title_string[1] + "  \u2191";
    }
    else {
        hook.innerText = "+ " + title_string[1] + "  \u2193";
    }
}

function click_experience(address) {
    const hook = document.getElementById(address);
    const style = window.getComputedStyle(hook);
    const isHidden = style.display === "none";

    if (isHidden) {
        hook.style.display = "flex";
        hook.classList.add("dropdown");
        if (address === "book_chapters") {
            const spaceHook = document.getElementById("lastSpacer");
            if (window.getComputedStyle(spaceHook).display === "block") {
                spaceHook.style.display = "none";
            }
        }
    } else {
        hook.style.display = "none";
        hook.classList.remove("dropdown");
        if (address === "book_chapters") {
            const spaceHook = document.getElementById("lastSpacer");
            if (window.getComputedStyle(spaceHook).display === "none") {
                spaceHook.style.display = "block";
            }
        }
    }
}


function blink() {
    const el = document.getElementById("logoBlock");
    const foot = document.getElementById("emailid");

    // Scroll to the element first
    if (foot) {
        foot.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    el.classList.remove("blink");
    foot.classList.remove("blink");

    // Blink three times at 500ms intervals
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            el.classList.add("blink");
            foot.classList.add("blink");
        }, i * 1000);

        setTimeout(() => {
            el.classList.remove("blink");
            foot.classList.remove("blink");
        }, i * 1000 + 500);
    }
}


function changeTheme() {
    let el = document.getElementById("logoBlock");
    let foot = document.getElementById("emailid");
    el.classList.remove("blink")
    foot.classList.remove("blink")


    setTimeout(function () {
        el.classList.add("blink")
        foot.classList.add("blink")
    }, 5);
}


function adjustFooterPosition() {
    const footer = document.querySelector("footer");
    const body = document.body;
    const html = document.documentElement;

    const contentHeight = Math.max(
        body.scrollHeight, body.offsetHeight,
        html.clientHeight, html.scrollHeight, html.offsetHeight
    );

    const viewportHeight = window.innerHeight;

    if (contentHeight <= viewportHeight) {
        footer.style.position = "fixed";
        footer.style.bottom = "0";
        footer.style.left = "0";
        footer.style.right = "0";
    } else {
        footer.style.position = "relative";
    }
}

// Run on load and on resize
window.addEventListener("load", adjustFooterPosition);
window.addEventListener("resize", adjustFooterPosition);
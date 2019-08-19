const btnLinks = document.querySelectorAll(".navlink");
btnLinks.forEach(btn => {
    const tabName = btn.id.match(/nav_btn_(.+)/i)[1];
    btn.addEventListener('click', (evt) => {
        navUtils.openTab(evt, tabName);
    });
    console.log("tab name: ", tabName);
});
console.dir(btnLinks);
// alert("hello from nav");

export const navUtils = {
    openTab(evt, tabName) {
        const tabContent = document.querySelectorAll(".tabcontent");
        tabContent.forEach(t =>  {
            t.style.display = "none";
            t.classList.remove("active");
        });

        //remove active class from all navlinks
        const tabLinks = document.querySelectorAll(".navlink");
        tabLinks.forEach(n =>  {
            n.classList.remove("active");
        });

        const toOpenTab = [...tabContent].filter((t) => t.id.endsWith(tabName))[0];
        toOpenTab.style.display = "block";

        //remove highlight from tab button
        const tabBtn = document.querySelector(`#nav_btn_${tabName}`);
        tabBtn.classList.remove("nav__highlight");
        tabBtn.classList.add("active");
    },
    highlightTabButton(tabName) {
        console.log("navUtils.highlightTabButton("+tabName+")");
        // const tabLinks = document.querySelectorAll(".navlink");
        // tabLinks.forEach(l => {
        //     l.classList.remove("nav__active");
        // });
        const tabBtn = document.querySelector(`#nav_btn_${tabName}`);

        //only if the tab is not currently opened
        if (! tabBtn.classList.contains("active") ) {
            tabBtn.classList.add("nav__highlight"); 
        }
        
        console.dir(tabBtn);
    }

}
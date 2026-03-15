(function(){

const token = localStorage.getItem("token")
const page = window.location.pathname.split("/").pop()

const publicPages = [
"login.html",
"register.html",
"verify-email.html"
]

if(!token && !publicPages.includes(page)){
window.location.href = "register.html"
}

if(token && publicPages.includes(page)){
window.location.href = "index.html"
}

})()
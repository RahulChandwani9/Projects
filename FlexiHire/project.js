
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  function redirectToSearch() {
    const query = searchInput.value.trim();
    if(query) {
      // Redirect to search.html with query as URL parameter
      window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }
  }

  // Click on button
  searchBtn.addEventListener("click", redirectToSearch);

  // Press Enter key in input
  searchInput.addEventListener("keyup", e => {
    if(e.key === "Enter") redirectToSearch();
  });


const companies = [
    "Amazon",
    "Google",
    "Microsoft",
    "Airbnb",
    "Uber",
    "Apple",
    "IBM",
    "Meta",
    "Netflix",
    "Dell",
    "Spotify"
  
];

const input = document.getElementById("searchInput");
const suggestionsBox = document.getElementById("suggestions");

input.addEventListener("input", function() {
  const value = input.value.toLowerCase();
  suggestionsBox.innerHTML = "";
  if(value){
    const filtered = companies.filter(c => c.toLowerCase().includes(value));
    filtered.forEach(company => {
      const div = document.createElement("div");
      div.textContent = company;
      div.addEventListener("click", () => {
        input.value = company;
        suggestionsBox.innerHTML = "";
        redirectSearch(); // optional: redirect immediately
      });
      suggestionsBox.appendChild(div);
    });
    suggestionsBox.style.display = filtered.length ? "block" : "none";
  } else {
    suggestionsBox.style.display = "none";
  }
});

// Close suggestions if clicked outside
document.addEventListener("click", e => {
  if(!input.contains(e.target) && !suggestionsBox.contains(e.target)){
    suggestionsBox.style.display = "none";
  }
});



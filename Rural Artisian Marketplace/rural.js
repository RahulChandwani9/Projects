const slides = document.querySelectorAll('.review-slide');
const prevBtn = document.getElementById('prev-review');
const nextBtn = document.getElementById('next-review');

let currentIndex = 0;
slides[currentIndex].classList.add('active');

function showSlide(index) {
  slides.forEach(slide => slide.classList.remove('active'));
  slides[index].classList.add('active');
}

nextBtn.addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % slides.length;
  showSlide(currentIndex);
});

prevBtn.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + slides.length) % slides.length;
  showSlide(currentIndex);
});

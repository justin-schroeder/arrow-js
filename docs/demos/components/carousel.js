import { html, reactive } from '@src/index'

const state = reactive({
  slides: [
    { name: 'Summer', image: 'https://picsum.photos/id/165/600/300' },
    { name: 'Autumn', image: 'https://picsum.photos/id/167/600/300' },
    { name: 'Winter', image: 'https://picsum.photos/id/260/600/300' },
    { name: 'Spring', image: 'https://picsum.photos/id/128/600/300' },
  ],
  currentSlide: 0,
})

function goToSlide(index) {
  if (index < 0) {
    state.currentSlide = state.slides.length + index
  } else if (index >= state.slides.length) {
    state.currentSlide = 0 + (index - state.slides.length)
  } else {
    state.currentSlide = index
  }
}

html` <div class="carousel-container">
  <button
    class="prev-button"
    @click="${() => goToSlide(state.currentSlide - 1)}"
  ></button>
  <button
    class="next-button"
    @click="${() => goToSlide(state.currentSlide + 1)}"
  ></button>
  <div class="carousel-inner">
    ${() =>
      state.slides.map(
        (slide, index) =>
          html`
            <figure
              class="slide"
              style="${() =>
                `transform: translateX(${
                  index - state.currentSlide
                }00%);opacity: ${index === state.currentSlide ? '1' : '0.5'};`}"
            >
              <img
                src="${slide.image}"
                alt="${slide.name}"
                title="${slide.name}"
              />
              <figcaption>Figure ${index + 1}. - ${slide.name}</figcaption>
            </figure>
          `
      )}
  </div>
  <div class="carousel-indicators">
    ${() =>
      state.slides.map(
        (slide, index) =>
          html`
            <button
              class="${() => (index === state.currentSlide ? 'active' : '')}"
              @click="${() => goToSlide(index)}"
            ></button>
          `
      )}
  </div>
</div>`(document.getElementById('arrow'))

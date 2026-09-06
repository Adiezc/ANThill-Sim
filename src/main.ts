import { CORE_VERSION } from './core/index.js'

const app = document.querySelector<HTMLDivElement>('#app')
if (app) {
  app.textContent = `Anthill — core ${CORE_VERSION}`
}

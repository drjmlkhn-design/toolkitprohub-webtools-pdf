document.body.insertAdjacentHTML("afterbegin", `
<nav class="nav">
  <a class="logo" href="index.html"><b>T</b>Toolkit Pro Hub</a>
  <span>Free PDF &amp; image tools · Private by design</span>
</nav>

<main class="workspace">
  <header class="head">
    <span class="tag">FREE · PRIVATE · NO UPLOADS</span>
    <h1 id="title"></h1>
    <p id="desc"></p>
  </header>

  <section class="panel">
    <div class="drop" id="drop">
      <div>
        <div class="big">☁</div>
        <strong>Drop <span id="kind"></span> here</strong>
        <p>or choose files from your device</p>
        <button class="btn" id="choose" type="button">Choose files</button>
      </div>
    </div>

    <input id="input" type="file" hidden>

    <div class="files" id="files"></div>

    <div class="options">
      <label class="pages-option" hidden>
        Pages
        <input id="pages" value="1" placeholder="Example: 1,3-5">
      </label>

      <label class="split-option" hidden>
        From page
        <input id="fromPage" type="number" min="1" value="1">
      </label>

      <label class="split-option" hidden>
        To page
        <input id="toPage" type="number" min="1" value="1">
      </label>

      <label class="width-option" hidden>
        Width
        <input id="width" type="number" min="1" value="1200">
      </label>

      <label class="height-option" hidden>
        Height
        <input id="height" type="number" min="1" placeholder="Auto">
      </label>

      <label class="quality-option" hidden>
        Quality
        <select id="quality">
          <option value="0.45">High compression</option>
          <option value="0.65" selected>Balanced</option>
          <option value="0.82">High quality</option>
        </select>
      </label>
    </div>

    <div class="actions">
      <button class="btn" id="run" type="button" hidden>Process file</button>
      <button class="btn alt" id="clear" type="button">Clear</button>
    </div>

    <p id="note" class="note">Your files never leave your device.</p>
  </section>
</main>

<footer class="foot">Toolkit Pro Hub · Files stay on your device.</footer>
`);
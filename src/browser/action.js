const {getURL} = browser.runtime;

const getInstalledScripts = async function() {
  const url = getURL('/src/scripts/_index.json');
  const file = await fetch(url);
  const installedScripts = await file.json();

  return installedScripts;
};

const writeEnabled = async function(event) {
  const {checked, id} = event.target;
  let {enabledScripts = []} = await browser.storage.local.get('enabledScripts');

  if (checked) {
    enabledScripts.push(id);
  } else {
    enabledScripts = enabledScripts.filter(x => x !== id);
  }

  browser.storage.local.set({enabledScripts});
};

const writePreference = async function(event) {
  const {id, tagName, type} = event.target;
  const [scriptName, preferenceName] = id.split('.');
  const storageKey = `${scriptName}.preferences`;
  const {[storageKey]: savedPreferences = {}} = await browser.storage.local.get(storageKey);

  if (tagName === 'INPUT') {
    switch (type) {
      case 'checkbox':
        savedPreferences[preferenceName] = event.target.checked;
        break;
      case 'text':
        savedPreferences[preferenceName] = event.target.value;
        break;
    }
  } else if (tagName === 'SELECT') {
    savedPreferences[preferenceName] = event.target.value;
  }

  browser.storage.local.set({[storageKey]: savedPreferences});
};

const renderScripts = async function() {
  const scriptsSection = document.getElementById('scripts');
  const installedScripts = await getInstalledScripts();
  const {enabledScripts = []} = await browser.storage.local.get('enabledScripts');

  for (const name of installedScripts) {
    const url = getURL(`/src/scripts/${name}.json`);
    const file = await fetch(url);
    const {title = name, description = '', icon = {}, preferences = {}} = await file.json();

    const scriptTemplateClone = document.getElementById('script').content.cloneNode(true);

    if (icon.class_name !== undefined) {
      const iconDiv = scriptTemplateClone.querySelector('div.icon');
      iconDiv.style.backgroundColor = icon.background_color || '#ffffff';

      const iconInner = iconDiv.querySelector('i');
      iconInner.classList.add(icon.class_name);
      iconInner.style.color = icon.color || '#000000';
    }

    const titleHeading = scriptTemplateClone.querySelector('h4.title');
    titleHeading.textContent = title;

    if (description !== '') {
      const descriptionParagraph = scriptTemplateClone.querySelector('p.description');
      descriptionParagraph.textContent = description;
    }

    const unorderedList = scriptTemplateClone.querySelector('ul');

    const enabledInput = unorderedList.querySelector('input');
    enabledInput.id = name;
    enabledInput.checked = enabledScripts.includes(name);
    enabledInput.addEventListener('input', writeEnabled);

    const enabledLabel = unorderedList.querySelector('label');
    enabledLabel.setAttribute('for', name);

    const storageKey = `${name}.preferences`;
    const {[storageKey]: savedPreferences = {}} = await browser.storage.local.get(storageKey);

    for (const [key, preference] of Object.entries(preferences)) {
      const savedPreference = savedPreferences[key] === undefined ? preference.default : savedPreferences[key];
      const preferenceTemplateClone = document.getElementById(`${preference.type}-preference`).content.cloneNode(true);

      const preferenceLabel = preferenceTemplateClone.querySelector('label');
      preferenceLabel.textContent = preference.label;
      preferenceLabel.setAttribute('for', `${name}.${key}`);

      const inputType = {
        checkbox: 'input',
        text: 'input',
        color: 'input',
        select: 'select',
      }[preference.type];

      const preferenceInput = preferenceTemplateClone.querySelector(inputType);
      preferenceInput.id = `${name}.${key}`;
      preferenceInput.addEventListener('input', writePreference);

      switch (preference.type) {
        case 'checkbox':
          preferenceInput.checked = savedPreference;
          break;
        case 'text':
        case 'color':
          preferenceInput.value = savedPreference;
          break;
        case 'select':
          for (const [value, text] of Object.entries(preference.options)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            option.selected = value === savedPreference;
            preferenceInput.appendChild(option);
          }
          break;
      }

      unorderedList.appendChild(preferenceTemplateClone);
    }

    scriptsSection.appendChild(scriptTemplateClone);
  }

  const $makeSpectrum = $(scriptsSection).find('.makeSpectrum');

  $makeSpectrum.spectrum({
    preferredFormat: 'hex',
    showInput: true,
    showInitial: true,
    allowEmpty: true,
  });
  $makeSpectrum.on('change.spectrum', writePreference);
};

$('nav a').click(event => {
  event.preventDefault();
  $('nav .selected').removeClass('selected');
  $(event.target).addClass('selected');
  $('section.open').removeClass('open');
  $(`section${event.target.getAttribute('href')}`).addClass('open');
});

renderScripts();

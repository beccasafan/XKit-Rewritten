const {getURL} = browser.runtime;

const getInstalledScripts = async function() {
  const url = getURL('/src/scripts/_index.json');
  const file = await fetch(url);
  const installedScripts = await file.json();

  return installedScripts;
};

const getInstalledTweaks = async function() {
  const url = getURL('/src/tweaks/_gallery.json');
  const file = await fetch(url);
  const installedTweaks = await file.json();

  return installedTweaks;
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

const writeEnabledTweak = async function(event) {
  const {checked, id} = event.target;
  let {enabledTweaks = []} = await browser.storage.local.get('enabledTweaks');

  if (checked) {
    enabledTweaks.push(id);
  } else {
    enabledTweaks = enabledTweaks.filter(x => x !== id);
  }

  browser.storage.local.set({enabledTweaks});
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

    const fieldset = document.createElement('fieldset');

    const legend = document.createElement('legend');
    legend.textContent = title;
    fieldset.appendChild(legend);

    const metaDiv = document.createElement('div');
    metaDiv.classList.add('meta');
    fieldset.appendChild(metaDiv);

    if (description) {
      const p = document.createElement('p');
      p.textContent = description;
      metaDiv.appendChild(p);
    }

    if (icon.class_name !== undefined) {
      const iconDiv = document.createElement('div');
      iconDiv.classList.add('icon');
      iconDiv.style.backgroundColor = icon.background_color || '#ffffff';

      const iconInner = document.createElement('i');
      iconInner.classList.add(icon.class_name, 'ri-fw');
      iconInner.style.color = icon.color || '#000000';
      iconDiv.appendChild(iconInner);

      metaDiv.appendChild(iconDiv);
    }

    const unorderedList = document.createElement('ul');
    fieldset.appendChild(unorderedList);

    const listItem = document.createElement('li');
    unorderedList.appendChild(listItem);

    const input = document.createElement('input');
    input.id = name;
    input.type = 'checkbox';
    input.checked = enabledScripts.includes(name);
    input.addEventListener('input', writeEnabled);
    listItem.appendChild(input);

    const label = document.createElement('label');
    label.setAttribute('for', name);
    label.textContent = 'Enabled';
    listItem.appendChild(label);

    if (Object.keys(preferences).length !== 0) {
      const storageKey = `${name}.preferences`;
      const {[storageKey]: savedPreferences = {}} = await browser.storage.local.get(storageKey);

      for (const [key, preference] of Object.entries(preferences)) {
        const savedPreference = savedPreferences[key] === undefined ? preference.default : savedPreferences[key];

        const preferenceListItem = document.createElement('li');

        const inputType = {
          checkbox: 'input',
          text: 'input',
          color: 'input',
          select: 'select',
        }[preference.type];

        const preferenceInput = document.createElement(inputType);
        preferenceInput.id = `${name}.${key}`;
        preferenceInput.addEventListener('input', writePreference);

        if (inputType === 'input') {
          if (preference.type === 'color') {
            preferenceInput.type = 'text';
            preferenceInput.classList.add('makeSpectrum');
          } else {
            preferenceInput.type = preference.type;
          }
        }

        const preferenceLabel = document.createElement('label');
        preferenceLabel.setAttribute('for', `${name}.${key}`);
        preferenceLabel.textContent = preference.label;

        switch (preference.type) {
          case 'checkbox':
            preferenceInput.checked = savedPreference;
            preferenceListItem.appendChild(preferenceInput);
            preferenceListItem.appendChild(preferenceLabel);
            break;
          case 'text':
            preferenceInput.value = savedPreference;
            preferenceListItem.appendChild(preferenceLabel);
            preferenceListItem.appendChild(preferenceInput);
            break;
          case 'color':
            preferenceInput.value = savedPreference;
            preferenceListItem.appendChild(preferenceInput);
            preferenceListItem.appendChild(preferenceLabel);
            break;
          case 'select':
            for (const [value, text] of Object.entries(preference.options)) {
              const option = document.createElement('option');
              option.value = value;
              option.textContent = text;
              option.selected = value === savedPreference;
              preferenceInput.appendChild(option);
            }
            preferenceListItem.appendChild(preferenceLabel);
            preferenceListItem.appendChild(preferenceInput);
            break;
        }

        unorderedList.appendChild(preferenceListItem);
      }
    }

    scriptsSection.appendChild(fieldset);

    const $makeSpectrum = $(fieldset).find('.makeSpectrum');

    $makeSpectrum.spectrum({
      preferredFormat: 'hex',
      showInput: true,
      showInitial: true,
      allowEmpty: true,
    });
    $makeSpectrum.on('change.spectrum', writePreference);
  }
};

const renderTweaks = async function() {
  const tweaksSection = document.getElementById('tweaks');
  const installedTweaks = await getInstalledTweaks();
  const {enabledTweaks = []} = await browser.storage.local.get('enabledTweaks');

  const unorderedList = document.createElement('ul');

  for (const [name, labelText] of installedTweaks) {
    const listItem = document.createElement('li');

    const input = document.createElement('input');
    input.id = name;
    input.type = 'checkbox';
    input.checked = enabledTweaks.includes(name);
    input.addEventListener('input', writeEnabledTweak);
    listItem.appendChild(input);

    const label = document.createElement('label');
    label.setAttribute('for', name);
    label.textContent = labelText;
    listItem.appendChild(label);

    unorderedList.appendChild(listItem);
  }

  tweaksSection.appendChild(unorderedList);
};

$('nav a').click(event => {
  event.preventDefault();
  $('nav .selected').removeClass('selected');
  $(event.target).addClass('selected');
  $('section.open').removeClass('open');
  $(`section${event.target.getAttribute('href')}`).addClass('open');
});

renderScripts();
renderTweaks();

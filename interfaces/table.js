/* Table entry — fill the editable cells of a given table
   STATUS: stub. Paste the built version below, replacing the factory body.
   Contract: create(container, { question, value, onChange }) -> { update, clear, destroy } */

Ned.register('table',
  {
    name: 'Table entry',
    unlocks: 'results/trace tables',
    samples: [
      // { label: '…', question: { text: '…', marks: 1, config: {} } },
    ],
  },
  function (container, { question, value, onChange }) {
    // TODO: build this interface. It must:
    //  - render into `container`
    //  - call onChange(value) when the answer changes  (empty => null)
    //  - return { update, clear, destroy }
    container.appendChild(
      Ned.el('p', { class: 'ned-note' }, ['Table entry — not built yet. Paste the code here.']));

    return {
      update:  function (v) {},
      clear:   function () {},
      destroy: function () { container.innerHTML = ''; },
    };
  });

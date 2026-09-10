/* Circuit (build) — place components on a grid and wire them
   STATUS: stub. Paste the built version below, replacing the factory body.
   Contract: create(container, { question, value, onChange }) -> { update, clear, destroy } */

Ned.register('circuit',
  {
    name: 'Circuit (build)',
    unlocks: 'physics circuits',
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
      Ned.el('p', { class: 'ned-note' }, ['Circuit (build) — not built yet. Paste the code here.']));

    return {
      update:  function (v) {},
      clear:   function () {},
      destroy: function () { container.innerHTML = ''; },
    };
  });

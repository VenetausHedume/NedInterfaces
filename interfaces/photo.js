/* Photo upload — photograph a drawing and tag the question
   STATUS: stub. Paste the built version below, replacing the factory body.
   Contract: create(container, { question, value, onChange }) -> { update, clear, destroy } */

Ned.register('photo',
  {
    name: 'Photo upload',
    unlocks: 'catch-all',
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
      Ned.el('p', { class: 'ned-note' }, ['Photo upload — not built yet. Paste the code here.']));

    return {
      update:  function (v) {},
      clear:   function () {},
      destroy: function () { container.innerHTML = ''; },
    };
  });

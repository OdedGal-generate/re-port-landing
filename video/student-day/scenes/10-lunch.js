// Scene 10-lunch — placeholder (to be implemented)
V.registerScene('10-lunch', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '10-lunch', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

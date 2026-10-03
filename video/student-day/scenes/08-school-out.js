// Scene 08-school-out — placeholder (to be implemented)
V.registerScene('08-school-out', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '08-school-out', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

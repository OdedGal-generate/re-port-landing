// Scene 09-walk-home — placeholder (to be implemented)
V.registerScene('09-walk-home', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '09-walk-home', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

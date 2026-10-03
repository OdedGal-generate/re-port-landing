// Scene 13-back-home — placeholder (to be implemented)
V.registerScene('13-back-home', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '13-back-home', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

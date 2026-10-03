// Scene 04-dress — placeholder (to be implemented)
V.registerScene('04-dress', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '04-dress', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

// Scene 17-sleep — placeholder (to be implemented)
V.registerScene('17-sleep', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '17-sleep', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

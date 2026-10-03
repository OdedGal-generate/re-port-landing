// Scene 12-training — placeholder (to be implemented)
V.registerScene('12-training', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '12-training', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

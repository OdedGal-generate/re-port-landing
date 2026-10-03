// Scene 01-wake — placeholder (to be implemented)
V.registerScene('01-wake', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '01-wake', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

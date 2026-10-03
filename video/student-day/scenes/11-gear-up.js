// Scene 11-gear-up — placeholder (to be implemented)
V.registerScene('11-gear-up', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '11-gear-up', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

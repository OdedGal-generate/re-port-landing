// Scene 03-teeth — placeholder (to be implemented)
V.registerScene('03-teeth', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '03-teeth', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

// Scene 16-friends — placeholder (to be implemented)
V.registerScene('16-friends', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '16-friends', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

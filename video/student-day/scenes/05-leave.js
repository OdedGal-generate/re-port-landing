// Scene 05-leave — placeholder (to be implemented)
V.registerScene('05-leave', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '05-leave', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

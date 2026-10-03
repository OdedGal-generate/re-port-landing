// Scene 02-shower — placeholder (to be implemented)
V.registerScene('02-shower', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '02-shower', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

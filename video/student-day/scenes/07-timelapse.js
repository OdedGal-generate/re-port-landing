// Scene 07-timelapse — placeholder (to be implemented)
V.registerScene('07-timelapse', {
  sfx: [],
  draw(ctx, t, info) {
    V.sky(ctx, 12);
    V.text(ctx, '07-timelapse', V.W / 2, V.H / 2, { size: 90, color: '#fff', stroke: '#000' });
  },
});

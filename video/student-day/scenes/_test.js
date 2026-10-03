// Rig test sheet (not part of the film). Render: node tools/render.mjs stills _test 0
V.registerScene('_test', {
  dur: 4,
  draw(ctx, t) {
    V.sky(ctx, 10);
    ctx.fillStyle = V.pal.grass;
    ctx.fillRect(0, 800, V.W, 280);
    const B = V.boy, P = B.pose;
    const g = 800;
    const items = [
      [160, P.stand({ outfit: 'pajamas', mouth: 'yawn', eyes: 'half' })],
      [400, P.walk(t * 1.2, { outfit: 'school', backpack: true })],
      [640, P.run(t * 1.5, { outfit: 'sport' })],
      [880, P.stand({ outfit: 'towel', facing: -1, mouth: 'grin', eyes: 'happy' })],
      [1120, P.stand({ outfit: 'evening', look: { skin: '#8d5a3b', hair: '#111111', hairStyle: 'curly' }, mouth: 'open' })],
      [1360, P.stand({ outfit: 'home', look: { hair: '#e0b35a', hairStyle: 'short', skin: '#f3c7a8' }, eyes: 'wide', mouth: 'o' })],
      [1600, P.kick(V.seg(t, 0, 2), { outfit: 'sport' })],
    ];
    items.forEach(([x, p]) => {
      const y = B.standY(g, 1, p);
      V.groundShadow(ctx, x, g, 60);
      B.draw(ctx, x, y, 1, p);
    });
    // sitting + lying
    V.fillRound(ctx, 1700, 900, 160, 20, 6, '#8b5a3c');
    B.draw(ctx, 1780, 890, 0.7, P.sit({ outfit: 'home', mouth: 'chew' }));
    B.draw(ctx, 300, 980, 0.6, P.lie({ outfit: 'pajamas' }));
    V.alarmClock(ctx, 700, 1000, 0.6, '07:30', { ring: 1, t });
    V.wallClockStr(ctx, 1000, 940, 60, '15:15');
    V.phone(ctx, 1250, 930, 0.35, '01:30');
  },
});

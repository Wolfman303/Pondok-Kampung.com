class Arena {
  constructor() {
    this.width = 2000;
    this.height = 2000;

    // contoh tembok
    this.walls = [
      {x: 400, y: 400, w: 200, h: 50},
      {x: 800, y: 1000, w: 100, h: 300},
      {x: 1500, y: 700, w: 300, h: 50},
    ];
  }

  draw(ctx, camera) {
    ctx.fillStyle = "#444";
    ctx.fillRect(-camera.x, -camera.y, this.width, this.height);

    ctx.fillStyle = "#777";
    this.walls.forEach(wall => {
      ctx.fillRect(wall.x - camera.x, wall.y - camera.y, wall.w, wall.h);
    });
  }
}

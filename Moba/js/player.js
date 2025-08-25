class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 25;
    this.color = "cyan";
    this.speed = 3;
  }

  update(input, arenaWidth, arenaHeight) {
    this.x += input.dx * this.speed;
    this.y += input.dy * this.speed;

    // Batas arena
    this.x = clamp(this.x, this.size, arenaWidth - this.size);
    this.y = clamp(this.y, this.size, arenaHeight - this.size);
  }

  draw(ctx, camera) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x - camera.x, this.y - camera.y, this.size, 0, Math.PI*2);
    ctx.fill();
  }
}

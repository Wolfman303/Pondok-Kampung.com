class Bot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 25;
    this.color = "red";
    this.maxHp = 5000;
    this.hp = this.maxHp;
  }

  takeDamage(dmg) {
    this.hp = Math.max(0, this.hp - dmg);
  }

  draw(ctx, camera) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x - camera.x, this.y - camera.y, this.size, 0, Math.PI*2);
    ctx.fill();

    // HP bar
    ctx.fillStyle = "green";
    ctx.fillRect(this.x - camera.x - 30, this.y - camera.y - 40, 60 * (this.hp/this.maxHp), 6);
    ctx.strokeStyle = "black";
    ctx.strokeRect(this.x - camera.x - 30, this.y - camera.y - 40, 60, 6);
  }
}

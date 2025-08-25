const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");
let joy = { active:false, dx:0, dy:0, max:40 };

// Joystick logic
joystick.addEventListener("touchstart", e => { joy.active = true; });
joystick.addEventListener("touchend", e => {
  joy.active = false;
  stick.style.left = "40px";
  stick.style.top = "40px";
  joy.dx = 0; joy.dy = 0;
});
joystick.addEventListener("touchmove", e => {
  e.preventDefault();
  const rect = joystick.getBoundingClientRect();
  const touch = e.touches[0];
  let x = touch.clientX - rect.left - rect.width/2;
  let y = touch.clientY - rect.top - rect.height/2;

  const dist = Math.sqrt(x*x + y*y);
  if(dist > joy.max) {
    x = (x / dist) * joy.max;
    y = (y / dist) * joy.max;
  }

  stick.style.left = (40 + x) + "px";
  stick.style.top = (40 + y) + "px";

  joy.dx = x / joy.max;
  joy.dy = y / joy.max;
}, { passive:false });

// Tombol skill
document.querySelectorAll(".btn[data-skill]").forEach(btn => {
  btn.addEventListener("click", () => {
    const skill = btn.dataset.skill;
    let duration = 5 + parseInt(skill); // dummy cooldown
    useSkill(skill, duration, btn);
  });
});

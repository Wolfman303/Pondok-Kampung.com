let cooldowns = {};

function useSkill(skill, duration, btn) {
  if (cooldowns[skill]) return; // masih cooldown

  btn.classList.add("cooldown");
  cooldowns[skill] = duration;

  let cdText = document.createElement("div");
  cdText.className = "cooldown-text";
  cdText.innerText = duration;
  btn.appendChild(cdText);

  let interval = setInterval(() => {
    cooldowns[skill]--;
    if (cooldowns[skill] > 0) {
      cdText.innerText = cooldowns[skill];
    } else {
      clearInterval(interval);
      delete cooldowns[skill];
      btn.classList.remove("cooldown");
      btn.removeChild(cdText);
    }
  }, 1000);
}

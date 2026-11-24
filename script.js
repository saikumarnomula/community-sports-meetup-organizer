// data is saved in localStorage (this browser only)
var meetups = JSON.parse(localStorage.getItem("meetups")) || [];
var users = JSON.parse(localStorage.getItem("users")) || [];
var user = localStorage.getItem("user") || "";   // the logged in person's EMAIL (email = identity)
var page = "home";

var filter = "All";

var sports = ["Football", "Cricket", "Badminton", "Basketball", "Volleyball", "Tennis", "Table Tennis", "Hockey", "Kabaddi"];
var icons = { All: "🏆", Football: "⚽", Cricket: "🏏", Badminton: "🏸", Basketball: "🏀", Volleyball: "🏐",
              Tennis: "🎾", "Table Tennis": "🏓", Hockey: "🏑", Kabaddi: "🤼", Other: "🏅" };
var colors = { Football: "#2e7d32", Cricket: "#1565c0", Badminton: "#8e24aa", Basketball: "#ef6c00", Volleyball: "#f9a825",
               Tennis: "#689f38", "Table Tennis": "#d81b60", Hockey: "#00838f", Kabaddi: "#6d4c41" };

function getIcon(sport) { return icons[sport] || icons.Other; }
function getColor(sport) { return colors[sport] || "#455a64"; }

// make text safe to show inside HTML
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function save() {
  localStorage.setItem("meetups", JSON.stringify(meetups));
  localStorage.setItem("users", JSON.stringify(users));
}

// ---------- users ----------
// every person is identified by email. Two people can have the same name.
function getName(email) {
  for (var i = 0; i < users.length; i++) {
    if (users[i].email == email) return users[i].name;
  }
  return email;
}

// old saved data stored names instead of emails: convert them once
function toEmail(value) {
  if (String(value).indexOf("@") != -1) return value;
  for (var i = 0; i < users.length; i++) {
    if (users[i].name == value) return users[i].email;
  }
  return value;
}

function fixOldData() {
  for (var i = 0; i < meetups.length; i++) {
    var m = meetups[i];
    m.organizer = toEmail(m.organizer);
    m.players = m.players.map(toEmail);
    m.waiting = m.waiting.map(toEmail);
    m.present = m.present.map(toEmail);
  }
  if (user != "") user = toEmail(user);
  save();
  localStorage.setItem("user", user);
}

// ---------- login and logout ----------
// one email = one person. The same name with a different email is allowed.
function login() {
  var name = document.getElementById("userName").value.trim();
  var email = document.getElementById("userEmail").value.trim().toLowerCase();
  if (name == "" || email.indexOf("@") == -1 || email.indexOf(".") == -1) {
    alert("Enter your name and a valid email");
    return;
  }
  var found = false;
  for (var i = 0; i < users.length; i++) {
    if (users[i].email == email) {
      if (users[i].name.toLowerCase() != name.toLowerCase()) {
        alert("This email is already used by \"" + users[i].name + "\". One email can be used by only one person.");
        return;
      }
      found = true;
    }
  }
  if (!found) users.push({ name: name, email: email });

  user = email;
  localStorage.setItem("user", user);
  save();
  showAll();
}

function logout() {
  user = "";
  page = "home";
  localStorage.removeItem("user");
  showAll();
}

// ---------- meetup functions ----------
function checkOther() {
  var isOther = document.getElementById("sport").value == "Other";
  document.getElementById("otherBox").style.display = isOther ? "block" : "none";
}

function addMeetup() {
  var sport = document.getElementById("sport").value;
  if (sport == "Other") sport = document.getElementById("otherSport").value.trim();
  var venue = document.getElementById("venue").value.trim();
  var time = document.getElementById("datetime").value;
  var limit = Number(document.getElementById("limit").value);
  if (sport == "" || venue == "" || time == "" || limit < 1) {
    alert("Fill all the fields");
    return;
  }
  meetups.push({
    id: Date.now(),
    sport: sport,
    venue: venue,
    time: time,
    limit: limit,
    organizer: user,
    players: [],
    waiting: [],
    present: []
  });
  save();
  document.getElementById("otherSport").value = "";
  page = "mine";
  showAll();
}

function getMeetup(id) {
  for (var i = 0; i < meetups.length; i++) {
    if (meetups[i].id == id) return meetups[i];
  }
}

function join(id) {
  var m = getMeetup(id);
  if (m.players.indexOf(user) != -1 || m.waiting.indexOf(user) != -1) return;
  if (m.players.length < m.limit) {
    m.players.push(user);
  } else {
    m.waiting.push(user);
    alert("Meetup is full. You are on the waiting list");
  }
  save();
  showAll();
}

function leave(id) {
  var m = getMeetup(id);
  if (m.waiting.indexOf(user) != -1) {
    m.waiting.splice(m.waiting.indexOf(user), 1);
    save();
    showAll();
  } else {
    removePlayer(id, user);
  }
}

function removePlayer(id, email) {
  var m = getMeetup(id);
  m.players.splice(m.players.indexOf(email), 1);
  if (m.present.indexOf(email) != -1) m.present.splice(m.present.indexOf(email), 1);
  if (m.waiting.length > 0) m.players.push(m.waiting.shift());
  save();
  showAll();
}

// organizer buttons use the player's position in the list
function removeByIndex(id, i) {
  removePlayer(id, getMeetup(id).players[i]);
}

function toggleAttendance(id, i) {
  var m = getMeetup(id);
  var email = m.players[i];
  var pos = m.present.indexOf(email);
  if (pos == -1) m.present.push(email);
  else m.present.splice(pos, 1);
  save();
  showAll();
}

function deleteMeetup(id) {
  meetups = meetups.filter(function (m) { return m.id != id; });
  save();
  showAll();
}

// ---------- showing things on the page ----------
function joinButton(m) {
  if (m.players.indexOf(user) != -1 || m.waiting.indexOf(user) != -1) {
    return "<button class='red' onclick='leave(" + m.id + ")'>Leave</button>";
  }
  if (m.players.length >= m.limit) {
    return "<button class='orange' onclick='join(" + m.id + ")'>Join Waiting List</button>";
  }
  return "<button class='green' onclick='join(" + m.id + ")'>Join</button>";
}

function makeCard(m, withControls) {
  var full = m.players.length >= m.limit;
  var html = "<div class='card" + (withControls ? " wide" : "") + "'>";
  html += "<div class='banner' style='background:" + getColor(m.sport) + "'><span>" + esc(m.sport) + "</span><span>" + getIcon(m.sport) + "</span></div>";
  html += "<div class='body'>";
  html += "<b>" + esc(m.venue) + "</b><br>";
  html += "🕑 " + m.time.replace("T", " ") + "<br>";
  html += "👤 Organizer: " + esc(getName(m.organizer)) + "<br>";
  html += "<div class='bar'><div style='width:" + (m.players.length / m.limit * 100) + "%'></div></div>";
  html += m.players.length + " / " + m.limit + " players" + (full ? " (FULL)" : "") + ", " + m.waiting.length + " waiting<br>";

  if (!withControls) {
    html += joinButton(m);
  } else {
    html += "<div class='tablebox'><table><tr><th>Player</th><th>Email</th><th>Present</th><th>Remove</th></tr>";
    if (m.players.length == 0) html += "<tr><td colspan='4'>No players have joined yet</td></tr>";
    for (var i = 0; i < m.players.length; i++) {
      var p = m.players[i];
      var checked = m.present.indexOf(p) != -1 ? "checked" : "";
      html += "<tr><td>" + esc(getName(p)) + "</td><td>" + esc(p) + "</td>";
      html += "<td><input type='checkbox' style='width:auto' " + checked + " onclick='toggleAttendance(" + m.id + "," + i + ")'></td>";
      html += "<td><button class='red' onclick='removeByIndex(" + m.id + "," + i + ")'>X</button></td></tr>";
    }
    html += "</table></div>";
    html += "<button class='red' onclick='deleteMeetup(" + m.id + ")'>Delete Meetup</button>";
  }
  return html + "</div></div>";
}

function fillCards(boxId, test, controls, emptyText) {
  var html = "";
  for (var i = 0; i < meetups.length; i++) {
    if (test(meetups[i])) html += makeCard(meetups[i], controls);
  }
  if (html == "") html = "<p>" + emptyText + "</p>";
  document.getElementById(boxId).innerHTML = html;
}

function setFilter(sport) {
  filter = sport;
  showAll();
  document.getElementById("meetupTitle").scrollIntoView();
}

function showHome() {
  var joined = 0, mine = 0;
  for (var i = 0; i < meetups.length; i++) {
    joined += meetups[i].players.length;
    if (meetups[i].players.indexOf(user) != -1) mine++;
  }
  document.getElementById("stats").innerHTML =
    "<div><b>" + meetups.length + "</b>Meetups</div><div><b>" + joined + "</b>Players joined</div>" +
    "<div><b>" + sports.length + "</b>Sports</div><div><b>" + mine + "</b>You joined</div>";

  var names = ["All"].concat(sports).concat(["Other"]);
  var html = "";
  for (var j = 0; j < names.length; j++) {
    html += "<div class='sport " + (names[j] == filter ? "on" : "") + "' onclick=\"setFilter('" + names[j] + "')\"><div>" +
            icons[names[j]] + "</div>" + names[j] + "</div>";
  }
  document.getElementById("sportLinks").innerHTML = html;
  document.getElementById("meetupTitle").innerHTML = filter == "All" ? "All meetups" : filter + " meetups";

  var sorted = meetups.slice().sort(function (a, b) { return a.time > b.time ? 1 : -1; });
  html = "";
  for (var k = 0; k < sorted.length; k++) {
    var m = sorted[k];
    var show = filter == "All" || m.sport == filter || (filter == "Other" && sports.indexOf(m.sport) == -1);
    if (show) {
      html += "<div class='line'><span>" + getIcon(m.sport) + " <b>" + esc(m.sport) + "</b> at " + esc(m.venue) + "<br>" +
              m.time.replace("T", " ") + " | " + m.players.length + " / " + m.limit + " players</span>" + joinButton(m) + "</div>";
    }
  }
  document.getElementById("homeList").innerHTML = html || "<p class='center'>No meetups found</p>";
}

function showReminders() {
  var html = "";
  for (var i = 0; i < meetups.length; i++) {
    var m = meetups[i];
    var hours = (new Date(m.time) - new Date()) / (1000 * 60 * 60);
    if (m.players.indexOf(user) != -1 && hours > 0 && hours <= 24) {
      html += "<div class='reminder'>" + esc(m.sport) + " at " + esc(m.venue) + " starts in " + hours.toFixed(1) + " hours</div>";
    }
  }
  document.getElementById("reminders").innerHTML = html || "No reminders";
}

function showReport() {
  var html = "<table><tr><th>Sport</th><th>Venue</th><th>Joined</th><th>Waiting</th><th>Attended</th></tr>";
  for (var i = 0; i < meetups.length; i++) {
    var m = meetups[i];
    if (m.organizer == user) {
      html += "<tr><td>" + esc(m.sport) + "</td><td>" + esc(m.venue) + "</td><td>" + m.players.length +
              "</td><td>" + m.waiting.length + "</td><td>" + m.present.length + "</td></tr>";
    }
  }
  document.getElementById("report").innerHTML = html + "</table>";
}

function showPage(name) {
  page = name;
  window.scrollTo(0, 0);
  showAll();
}

function showAll() {
  document.getElementById("loginPage").style.display = user == "" ? "block" : "none";
  document.getElementById("app").style.display = user == "" ? "none" : "block";
  if (user == "") return;

  document.getElementById("hello").innerHTML = esc(getName(user));
  var names = ["home", "create", "mine"];
  for (var i = 0; i < names.length; i++) {
    document.getElementById("page-" + names[i]).style.display = names[i] == page ? "block" : "none";
    document.getElementById("nav-" + names[i]).className = names[i] == page ? "active" : "";
  }

  showHome();
  fillCards("mineList", function (m) { return m.players.indexOf(user) != -1 || m.waiting.indexOf(user) != -1; }, false, "You have not joined any meetup");
  fillCards("controlList", function (m) { return m.organizer == user; }, true, "You have not created any meetup");
  showReminders();
  showReport();
}

fixOldData();
showAll();

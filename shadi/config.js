// Shadi page (irfanaafia.com/shadi): event details and settings. This is the one place to change what the reply form shows.
// (The date line on the invitation picture itself is in index.html: look for class="when".)
window.SITE = {
  // The address of the Google script that stores RSVPs. Leave empty to preview with sample guests.
  apiUrl: "https://script.google.com/macros/s/AKfycbyXSqae16rSS_ZKvuMKq4abf167Y7DLk82A0rK61g81n2JDaiRGOLXYy25HRLfk_I58TA/exec",
  // Tells the script these replies are for the Shadi (the script and the planner call it "nikkah"), so they are kept apart from the Walima replies.
  eventKey: "nikkah",

  deadlineText: "Sunday, December 13, 2026",

  // The plain link with no family code (irfanaafia.com/shadi) also takes a reply: the guest types a
  // name and how many are coming. These land in the planner's "Open replies" tab. Set to false to turn it off.
  openReplies: true,

  // The other event, shown to families who are invited to both. If the Walima date changes, change it here too.
  otherEvents: {
    walima: { name: "Walima", shortDate: "Mon, Jan 11", path: "/walima/", before: false }
  },

  events: [
    {
      id: "nikkah",
      name: "Shadi",
      dateText: "Tuesday, January 5, 2027",
      shortDate: "Tue, Jan 5",
      heading: "Shadi Ceremony",
      // the date as it is set out on the reply card (time: "" until it is known)
      dateParts: { weekday: "Tue", day: "5", month: "January", year: "2027", time: "at 5 pm" },
      timeText: "5:00 pm",
      venue: "The Blossom Events Centre",
      address: "204 Cardinal Crescent, Saskatoon, SK S7L 6H8",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=The%20Blossom%20Events%20Centre%2C%20204%20Cardinal%20Crescent%2C%20Saskatoon%2C%20SK%20S7L%206H8",
      // Calendar times in UTC. Saskatoon is 6 hours behind UTC all year, so 5:00 pm there is 23:00 UTC.
      // End time is a 5 hour placeholder. (If the time changes, also update shadi.ics.)
      calendarTitle: "Irfan & Aafia's Shadi",
      timeZone: "America/Regina", // Saskatoon's time zone
      startUTC: "20270105T230000Z",
      endUTC: "20270106T040000Z",
      icsFile: "shadi.ics"
    }
  ]
};

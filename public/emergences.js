/* THE LAST PLATFORM: the manifest.
   The platform is a drum of chambers. This file says what is in them.
   There are no worlds yet, so every chamber is vacant.

   To place a world in a chamber, add one object to EMERGENCES and push.
   It takes the next chamber, in the order listed.

   {
     id: "its-address",                thelastplatform.com/#its-address opens it
     name: "ITS NAME",
     inscription: "first emerged",     the small line above its name
     line: "What the world is, in its own voice.",
     terms: "Its own terms: how it is entered, played, paid for.",
     doors: [ { label: "Enter", href: "https://..." } ],
                                       a door with no href shows as not yet open
     feel: {                           the world's own feeling. The platform stays
       liquid: ["#top", "#bottom"],    black; only the chamber, and then the whole
       glow: "#colour",                screen once entered, takes these on.
       ink: "#colour",                 text colour once the world engulfs the screen
       ground: "#colour"               background once the world engulfs the screen
     }
   }
*/

window.PLATFORM = {
  /* Formspree endpoint for "send word". Empty = the list shows as not open. */
  signup: "https://formspree.io/f/meagozkd"
};

window.EMERGENCES = [
  /* the first emergence goes here */
];

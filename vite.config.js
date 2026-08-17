import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "/ATA_aim-to-asset/",

  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },

  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(
          new URL("./index.html", import.meta.url)
        ),

        "shape-picker": fileURLToPath(
          new URL("./shape-picker.html", import.meta.url)
        ),
      },
    },
  },
<<<<<<< HEAD
});
=======
});
>>>>>>> 135e862b943d5b2d3714e7ac1363b9089cde09a6

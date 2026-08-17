import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";


export default defineConfig({

  server: {

    cors: {
      origin: "https://www.owlbear.rodeo"
    }

  },


  build: {

    rollupOptions: {

      input: {

        main: fileURLToPath(
          new URL(
            "./index.html",
            import.meta.url
          )
        ),

        "shape-picker": fileURLToPath(
          new URL(
            "./shape-picker.html",
            import.meta.url
          )
        )

      }

    }

  }

});
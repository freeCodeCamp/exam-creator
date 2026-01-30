import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    recipes: {
      input: {
        base: {
          bg: "bg.panel",
          color: "fg",
        },
      },
      textarea: {
        base: {
          bg: "bg.panel",
          color: "fg",
        },
      },
      heading: {
        base: {
          color: "fg.info",
        },
      },
      select: {
        base: {
          bg: "bg.panel",
        },
      },
    },
    slotRecipes: {
      field: {
        slots: defaultConfig.theme?.slotRecipes?.field?.slots || [],
        base: {
          label: { color: "blue.fg" },
        },
      },
      table: {
        slots: defaultConfig.theme?.slotRecipes?.table?.slots || [],
        base: {
          columnHeader: {
            color: "gray.focusRing",
          },
          cell: {
            color: "gray.fg",
          },
        },
      },
      numberInput: {
        slots: defaultConfig.theme?.slotRecipes?.numberInput?.slots || [],
        base: {
          control: {
            color: "gray.fg",
          },
          input: {
            bg: "bg.emphasized",
          },
        },
      },
      checkbox: {
        slots: defaultConfig.theme?.slotRecipes?.checkbox?.slots || [],
        base: {
          root: {
            _hover: {
              cursor: "pointer",
            },
          },
          control: {
            _hover: {
              cursor: "pointer",
            },
          },
        },
      },
      menu: {
        slots: defaultConfig.theme?.slotRecipes?.menu?.slots || [],
        base: {
          root: {
            "&[data-hover]": {
              bg: "bg.muted",
            },
            _hover: {
              bg: "bg.muted",
            },
            _peerHover: {
              bg: "bg.muted",
            },
            "[data-hover] &": {
              bg: "bg.muted",
            },
            _groupHover: {
              bg: "bg.muted",
            },
          },
          trigger: {
            borderWidth: 1,
            borderColor: "border.emphasized",
            bg: "bg.panel",
            color: "fg",
            _hover: {
              bg: "bg.muted",
            },
            "&[data-hover]": {
              bg: "bg.muted",
            },
            _peerHover: {
              bg: "bg.muted",
            },
            "[data-hover] &": {
              bg: "bg.muted",
            },
            _groupHover: {
              bg: "bg.muted",
            },
          },
          item: {
            borderWidth: 1,
            borderColor: "border.emphasized",
            bg: "bg.panel",
            color: "fg",
            _hover: {
              cursor: "pointer",
              bg: "bg.muted",
            },
            "&[data-hover]": {
              bg: "bg.muted",
            },
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);

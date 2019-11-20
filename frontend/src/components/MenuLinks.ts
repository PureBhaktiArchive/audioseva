import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "MenuLinks"
})
export default class MenuLinks extends Vue {
  @Prop() parentRoute!: any;
  @Prop() activeClass!: string;

  getMenuLink({ meta, path }: any) {
    if (meta && meta.menuLinkName) return meta.menuLinkName;

    return path === "" ? "List" : `${path[0].toUpperCase()}${path.slice(1)}`;
  }

  renderMenuLinks(
    createElement: any,
    route: any,
    index: number,
    subGroup: boolean,
    fullPath: string
  ) {
    const id = `${fullPath || ""}-${index}-${route.path}`;
    return createElement(
      "v-list-group",
      {
        props: {
          noAction: true,
          subGroup
        },
        key: id
      },
      [
        MenuLinks.renderActivator(createElement, route),
        this.renderNestedChildren(
          createElement,
          route.children,
          fullPath || route.path.slice(0, -1)
        )
      ]
    );
  }

  static renderActivator(createElement: any, item: any) {
    return createElement(
      "v-list-item",
      {
        slot: "activator"
      },
      [
        createElement("v-list-item-content", [
          createElement("v-list-item-title", item.meta.activatorName)
        ])
      ]
    );
  }

  renderNestedChildren(
    createElement: any,
    children: any[],
    fullPath: string
  ): any {
    return children.map((route: any, index) => {
      if (route.meta && route.meta.activator) {
        return this.renderMenuLinks(
          createElement,
          route,
          index,
          true,
          `${fullPath}/${route.path}`
        );
      }
      if (route.meta.menuItem) {
        return createElement(
          "v-list-item",
          {
            props: {
              to: `/${fullPath}${route.path ? `/${route.path}` : ""}`,
              exact: true,
              link: true
            },
            key: `menu-link-${index}-${fullPath}${
              route.path ? `/${route.path}` : ""
            }`
          },
          [createElement("v-list-item-title", this.getMenuLink(route))]
        );
      }
    });
  }

  renderTopLevelActivators(createElement: any) {
    return [
      createElement(
        "v-list-item-title",
        {
          slot: "activator"
        },
        this.parentRoute.meta.activatorName
      ),
      createElement(
        "v-icon",
        {
          slot: "prependIcon",
          props: {
            color:
              this.activeClass === "inactive-menu"
                ? "rgba(0,0,0,.54)"
                : "inherit"
          }
        },
        this.parentRoute.meta.menuIcon
      ),
      this.renderNestedChildren(
        createElement,
        this.parentRoute.children,
        this.parentRoute.path.slice(0, -1)
      )
    ];
  }

  render(createElement: any) {
    return createElement(
      "v-list-group",
      {
        props: {
          noAction: true,
          prependIcon: this.parentRoute.meta.menuIcon,
          value: true,
          activeClass: this.activeClass
        }
      },
      this.renderTopLevelActivators(createElement)
    );
  }
}

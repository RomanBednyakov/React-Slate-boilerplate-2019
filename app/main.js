import React from "react";
import ReactDOM from "react-dom";
import { AppContainer } from "react-hot-loader";
import "font-awesome/css/font-awesome.min.css";

import Root from "./config/Root";

const render = Component => {
  ReactDOM.render(
    <AppContainer>
      <Component />
    </AppContainer>,
    document.getElementById("root")
  );
};

render(Root);

if (module.hot) {
  module.hot.accept("./config/Root", () => {
    const newApp = require("./config/Root").default;
    render(newApp);
  });
}

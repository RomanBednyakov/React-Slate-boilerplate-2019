import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { getMonthCalendar } from "../../redux/action/calendar";
import "./app.scss";
import SlateEditor from "../SlateEditor/SlateEditor";

const mapStateToProps = ({ calendar }) => ({
  calendar
});
const mapDispatchToProps = dispatch => ({
  getMonthCalendar: (year, month) => dispatch(getMonthCalendar(year, month))
});

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      description:
        "Customers can order a taxi or courier either through the company's website," +
        " or by using the company's GPS-based smartphone app.?" +
        " The app is compatible with iPhone and ﻿ Android platforms." +
        " Gett currently operates in more than 100 cities across the United States," +
        " the United Kingdom, Russia and Israel.**industry** ready for autonomus driving",
      isEditing: false
    };
  }
  onDescriptionChange = nodeElem => {
    this.setState({ description: nodeElem });
  };
  render() {
    return (
      <div className="app-wrapper">
        <div className="app-wrapper-editor">
          {this.state.isEditing ? (
            <div className="app-wrapper-editor-active">
              <SlateEditor
                value={this.state.description}
                onChange={this.onDescriptionChange}
              />
            </div>
          ) : (
            <div
              dangerouslySetInnerHTML={{ __html: this.state.description || "" }}
            />
          )}
          <button
            onClick={() => this.setState({ isEditing: !this.state.isEditing })}
            className="app-wrapper-editor-btn"
            style={{ background: `${this.state.isEditing ? "lightcyan" : ""}` }}
          >
            edit!
          </button>
        </div>
      </div>
    );
  }
}
App.propTypes = {
  getMonthCalendar: PropTypes.func.isRequired,
  calendar: PropTypes.shape({
    eventForMonth: PropTypes.array.isRequired
  }).isRequired
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);

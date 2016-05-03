/**
 * https://github.com/Microsoft/vscode/tree/master/src/vs/base/browser/ui/messagelist
 */
import React from 'react';
import { toSeverityAppClass, toTextLabel } from '../../../models/severity';

export class Message extends React.Component {

  renderActions() {
    return (
      <div className="actions-container">
        {this.props.message.actions.map((action, index) => {
          return (
            <div key={index} className="message-action">
              <a className="action-button" role="button" tabIndex="0" onClick={action.run.bind(action)}>{action.label}</a>
            </div>
          );
        })}
      </div>
    );
  }

  renderSeverity() {
    let severity = this.props.message.severity;
    let label = toTextLabel(severity);
    let severityClass = toSeverityAppClass(severity);
    let classes = 'message-left-side severity ' + severityClass;

    return (
      <span className={classes}>{label}</span>
    );
  }

  render() {
    return (
      <li className="message-list-entry message-list-entry-with-action">
        {this.renderActions(this.props.message)}
        <div className="message-left-side message-overflow-ellipsis">
          {this.renderSeverity()}
          <span className="message-left-side">{this.props.message.text}</span>
        </div>
      </li>
    );
  }
}

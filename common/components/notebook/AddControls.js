import React, { PureComponent } from 'react';

import { addCodeEmbedCell, addMarkdownCell, addRawCell, addCodeCell } from '../../actions/NotebookActions';
import Icon from '../Icon';
import { Toolbar, ActionItem } from '../Toolbar';

export default class AddControls extends PureComponent {

  constructor(props) {
    super(props);
    this.addCodeEmbedCell = this.addCodeEmbedCell.bind(this);
    this.addMarkdownCell = this.addMarkdownCell.bind(this);
    this.addRawCell = this.addRawCell.bind(this);
    this.addCodeCell = this.addCodeCell.bind(this);
  }

  addCodeEmbedCell() {
    this.props.dispatch(addCodeEmbedCell(this.props.cellIndex));
  }

  addCodeCell() {
    this.props.dispatch(addCodeCell(this.props.cellIndex));
  }


  addMarkdownCell() {
    this.props.dispatch(addMarkdownCell(this.props.cellIndex));
  }

  addRawCell() {
    this.props.dispatch(addRawCell(this.props.cellIndex));
  }

  render() {
    const { isEditModeActive } = this.props;
    if (!isEditModeActive) {
      return null;
    }
    return (
      <div className="add-controls col-12">
        <Toolbar className="notebook-toolbar">
          <ActionItem isIcon={true} title="Neuer Textabschnitt" onClick={this.addMarkdownCell}>
            <Icon name="file-text-o" className="icon-control" />
          </ActionItem>
          <ActionItem isIcon={true} title="Neues Code-Beispiel (IDE)" onClick={this.addCodeEmbedCell} >
            <Icon name="file-code-o" className="icon-control" />
          </ActionItem>
          <ActionItem isIcon={true} title="Neuer Code-Block" onClick={this.addCodeCell} >
            <Icon name="terminal" className="icon-control" />
          </ActionItem>
          <ActionItem isIcon={true} title="Neuer HTML-Block (Raw)" onClick={this.addRawCell} >
            <Icon name="code" className="icon-control" />
          </ActionItem>
        </Toolbar>
      </div>
    );
  }

}
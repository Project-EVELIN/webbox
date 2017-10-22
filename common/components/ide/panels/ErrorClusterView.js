import React from 'react';
import Debug from 'debug';

import {
  XYPlot,
  XAxis,
  YAxis,
  makeWidthFlexible,
  VerticalGridLines,
  HorizontalGridLines,
  VerticalBarSeries} from 'react-vis';

const FlexibleXYPlot = makeWidthFlexible(XYPlot);

const debug = Debug('webbox:ErrorClusterView');

/**
 * Displays a chart of the error clusters with the error name and the number of
 * occurences.
 *
 * @export
 * @class ErrorClusterView
 * @extends {React.Component}
 */
export default class ErrorClusterView extends React.Component {
  constructor(props) {
    super(props);

    this.onChange = this.onChange.bind(this);

    this.state = {
      clusters: []
    };
  }

  componentDidMount() {
    this.props.errorClusters.on('change', this.onChange);
    this.onChange();
  }

  componentWillUnmount() {
    this.props.errorClusters.removeListener('change', this.onChange);
  }

  onChange() {
    let data = this.props.errorClusters.toSeries();
    this.setState({
      data: data
    });
  }

  formatYAxisTicks(data) {
    if (data % 1 === 0) {
      return data;
    } else {
      return "";
    }
  }

  render() {
   // debug('render with state:', this.state);
    return (
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              <h4>Häufige Fehler</h4>
              <FlexibleXYPlot
                margin={{bottom: 70}}
                xType="ordinal"
                
                height={300}>
                <VerticalGridLines />
                <HorizontalGridLines />
                <XAxis tickPadding={65} tickLabelAngle={45} title="Typ" />
                <YAxis title="Anzahl" tickFormat={this.formatYAxisTicks} />
                <VerticalBarSeries data={this.state.data}/>
              </FlexibleXYPlot>
            </div>
          </div>
        </div>
    );
  }
}

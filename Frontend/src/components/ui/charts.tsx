import { Chart, type ChartOptions } from '@highcharts/react'

export function MiniTrend({ tone }: { tone: string }) {
  const color = tone === 'negative' ? '#ef4444' : tone === 'positive' ? '#22c55e' : '#64748b'
  const options: ChartOptions = {
    chart: {
      backgroundColor: 'transparent',
      height: 54,
      margin: [4, 0, 2, 0],
      spacing: [0, 0, 0, 0],
      type: 'areaspline',
    },
    credits: { enabled: false },
    legend: { enabled: false },
    title: { text: undefined },
    tooltip: { enabled: false },
    xAxis: { visible: false },
    yAxis: { visible: false, min: 0 },
    plotOptions: {
      series: {
        animation: false,
        enableMouseTracking: false,
        marker: { enabled: false },
        states: { inactive: { opacity: 1 } },
      },
      areaspline: {
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, `${color}33`],
            [1, `${color}00`],
          ],
        },
        lineWidth: 2,
      },
    },
    series: [
      {
        type: 'areaspline',
        color,
        data:
          tone === 'negative'
            ? [28, 24, 22, 25, 20, 22, 18, 17, 16, 14, 13, 12]
            : [12, 16, 14, 20, 18, 21, 23, 22, 25, 24, 28, 36],
      },
    ],
  }

  return <Chart containerProps={{ className: 'mini-trend' }} options={options} />
}

export function AreaChart() {
  const positiveColor = '#22c55e'
  const neutralColor = '#64748b'
  const negativeColor = '#ef4444'

  const options: ChartOptions = {
    chart: {
      backgroundColor: 'transparent',
      height: 260,
      marginBottom: 42,
      marginLeft: 64,
      marginRight: 18,
      spacing: [8, 8, 0, 0],
      type: 'area',
    },
    colors: [positiveColor, neutralColor, negativeColor],
    credits: { enabled: false },
    legend: { enabled: false },
    title: { text: undefined },
    tooltip: {
      shared: true,
      followTouchMove: true,
      hideDelay: 80,
      outside: true,
      shadow: {
        color: 'rgba(15, 23, 42, 0.16)',
        offsetX: 0,
        offsetY: 8,
        opacity: 0.16,
        width: 12,
      },
      snap: 80,
      borderColor: '#dbe5df',
      borderRadius: 12,
      padding: 10,
      backgroundColor: '#ffffff',
      style: {
        color: '#17211b',
        fontSize: '12px',
      },
    },
    xAxis: {
      categories: ['Apr 1', 'Apr 5', 'Apr 10', 'Apr 15', 'Apr 20', 'Apr 25', 'Apr 30'],
      lineColor: '#e2e8f0',
      tickColor: '#e2e8f0',
      labels: {
        overflow: 'justify',
        reserveSpace: true,
        style: { color: '#64748b', fontSize: '11px' },
        y: 22,
      },

      crosshair: {
        width: 1,
        color: '#cbd5e1',
        dashStyle: 'Solid',
        zIndex: 5,
      },
    },
    yAxis: {
      title: { text: undefined },
      gridLineDashStyle: 'Dash',
      gridLineColor: '#e2e8f0',
      labels: {
        align: 'right',
        reserveSpace: true,
        style: { color: '#64748b', fontSize: '11px' },
        x: -10,
      },
    },
    plotOptions: {
      area: {
        marker: { enabled: false },
        lineWidth: 2,
        stacking: 'normal',
      },
      series: {
        animation: false,
        allowPointSelect: false,
        cursor: 'default',
        findNearestPointBy: 'x',
        stickyTracking: true,
        states: {
          hover: { lineWidthPlus: 0 },
          inactive: { opacity: 1 },
        },
      },
    },
    series: [
      {
        type: 'area',
        name: 'Desktop',
        color: positiveColor,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, `${positiveColor}33`],
            [1, `${positiveColor}00`],
          ],
        },
        data: [1200, 2800, 3600, 5200, 7100, 8300, 9800],
      },
      {
        type: 'area',
        name: 'Mobile',
        color: neutralColor,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, `${neutralColor}33`],
            [1, `${neutralColor}00`],
          ],
        },
        data: [800, 1600, 2100, 3300, 4800, 5700, 6500],
      },
      {
        type: 'area',
        name: 'Tablet',
        color: negativeColor,
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, `${negativeColor}33`],
            [1, `${negativeColor}00`],
          ],
        },
        data: [500, 900, 1200, 1800, 2700, 3600, 4300],
      },
    ],
    responsive: {
      rules: [
        {
          condition: { maxWidth: 640 },
          chartOptions: {
            chart: {
              height: 280,
              marginBottom: 40,
              marginLeft: 46,
              marginRight: 10,
              spacing: [8, 4, 0, 0],
            },
            xAxis: {
              labels: {
                autoRotation: [-35],
                style: { fontSize: '10px' },
                y: 20,
              },
            },
            yAxis: {
              labels: {
                x: -7,
              },
            },
          },
        },
      ],
    },
  }

  return <Chart containerProps={{ className: 'area-chart' }} options={options} />
}

export function BarChart() {
  const barColor = '#22c55e'
  const lineColor = '#64748b'

  const options: ChartOptions = {
    chart: {
      backgroundColor: 'transparent',
      height: 260,
      marginBottom: 42,
      marginLeft: 64,
      marginRight: 18,
      spacing: [8, 8, 0, 0],
    },
    credits: { enabled: false },
    legend: { enabled: false },
    title: { text: undefined },
    tooltip: {
      shared: true,
      followTouchMove: true,
      hideDelay: 80,
      outside: true,
      snap: 80,
      borderRadius: 10,
      padding: 10,
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      shadow: false,
    },
    xAxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      lineColor: '#e2e8f0',
      tickColor: '#e2e8f0',
      labels: {
        overflow: 'justify',
        reserveSpace: true,
        style: {
          color: '#64748b',
          fontSize: '11px',
        },
        y: 22,
      },
      crosshair: {
        width: 1,
        color: '#cbd5e1',
        dashStyle: 'Solid',
        zIndex: 5,
      },
    },
    yAxis: {
      title: { text: undefined },
      gridLineDashStyle: 'Dash',
      gridLineColor: '#e2e8f0',
      labels: {
        align: 'right',
        reserveSpace: true,
        style: {
          color: '#64748b',
          fontSize: '11px',
        },
        x: -10,
      },
    },
    plotOptions: {
      column: {
        borderRadius: 8,
        borderWidth: 0,
        pointPadding: 0.28,
        groupPadding: 0.18,
      },
      line: {
        lineWidth: 2,
        marker: {
          enabled: false,
        },
      },
      series: {
        animation: false,
        allowPointSelect: false,
        cursor: 'default',
        findNearestPointBy: 'x',
        stickyTracking: true,
        states: {
          hover: { lineWidthPlus: 0 },
          inactive: { opacity: 1 },
        },
      },
    },
    series: [
      {
        type: 'column',
        name: 'Volume',
        color: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, `${barColor}8c`],
            [1, `${barColor}12`],
          ],
        },
        data: [9200, 10300, 8500, 11000, 10400, 8200, 7600],
      },
      {
        type: 'line',
        name: 'Trend',
        color: lineColor,
        data: [8800, 9600, 9100, 10300, 9900, 8700, 8200],
      },
    ],
    responsive: {
      rules: [
        {
          condition: { maxWidth: 640 },
          chartOptions: {
            chart: {
              height: 280,
              marginBottom: 40,
              marginLeft: 46,
              marginRight: 10,
              spacing: [8, 4, 0, 0],
            },
            xAxis: {
              labels: {
                autoRotation: [-35],
                style: { fontSize: '10px' },
                y: 20,
              },
            },
            yAxis: {
              labels: {
                x: -7,
              },
            },
          },
        },
      ],
    },
  }

  return <Chart containerProps={{ className: 'bar-chart' }} options={options} />
}

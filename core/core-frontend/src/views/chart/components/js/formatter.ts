import { Datum } from '@antv/g2plot'

export const formatterItem = {
  type: 'auto', // auto,value,percent
  unit: 1, // 换算单位
  suffix: '', // 单位后缀
  decimalCount: 2, // 小数位数
  thousandSeparator: true // 千分符
}

// 单位list
export const unitType = [
  { name: 'unit_none', value: 1 },
  { name: 'unit_thousand', value: 1000 },
  { name: 'unit_ten_thousand', value: 10000 },
  { name: 'unit_million', value: 1000000 },
  { name: 'unit_hundred_million', value: 100000000 }
]

// 格式化方式
export const formatterType = [
  { name: 'value_formatter_auto', value: 'auto' },
  { name: 'value_formatter_value', value: 'value' },
  { name: 'value_formatter_percent', value: 'percent' }
]

export function valueFormatter(value, formatter) {
  if (value === null || value === undefined) {
    return null
  }
  // 1.unit 2.decimal 3.thousand separator and suffix
  let result
  if (formatter.type === 'auto') {
    result = transSeparatorAndSuffix(transUnit(value, formatter), formatter)
  } else if (formatter.type === 'value') {
    result = transSeparatorAndSuffix(
      transDecimal(transUnit(value, formatter), formatter),
      formatter
    )
  } else if (formatter.type === 'percent') {
    value = value * 100
    result = transSeparatorAndSuffix(transDecimal(value, formatter), formatter)
  } else {
    result = value
  }
  return result
}

function transUnit(value, formatter) {
  return value / formatter.unit
}

function transDecimal(value, formatter) {
  const resultV = retain(value, formatter.decimalCount) as string
  if (Object.is(parseFloat(resultV), -0)) {
    return resultV.slice(1)
  }
  return resultV
}

function retain(value, n) {
  if (!n) return Math.round(value)
  const tran = Math.round(value * Math.pow(10, n)) / Math.pow(10, n)
  let tranV = tran.toString()
  const newVal = tranV.indexOf('.')
  if (newVal < 0) {
    tranV += '.'
  }
  for (let i = tranV.length - tranV.indexOf('.'); i <= n; i++) {
    tranV += '0'
  }
  return tranV
}

function transSeparatorAndSuffix(value, formatter) {
  let str = value + ''
  if (str.match(/^(\d)(\.\d)?e-(\d)/)) {
    str = value.toFixed(18).replace(/\.?0+$/, '')
  }
  if (formatter.thousandSeparator) {
    const thousandsReg = /(\d)(?=(\d{3})+$)/g
    const numArr = str.split('.')
    numArr[0] = numArr[0].replace(thousandsReg, '$1,')
    str = numArr.join('.')
  }
  if (formatter.type === 'percent') {
    str += '%'
    //百分比没有后缀，直接返回
    return str
  } else {
    if (formatter.unit === 1000) {
      str += '千'
    } else if (formatter.unit === 10000) {
      str += '万'
    } else if (formatter.unit === 1000000) {
      str += '百万'
    } else if (formatter.unit === 100000000) {
      str += '亿'
    }
  }
  return str + formatter.suffix.replace(/(^\s*)|(\s*$)/g, '')
}

export function singleDimensionTooltipFormatter(param: Datum, chart: Chart, prop = 'category') {
  let res
  const yAxis = chart.yAxis
  const obj = { name: param[prop], value: param.value }
  for (let i = 0; i < yAxis.length; i++) {
    const f = yAxis[i]
    if (f.name === param[prop]) {
      if (f.formatterCfg) {
        res = valueFormatter(param.value, f.formatterCfg)
      } else {
        res = valueFormatter(param.value, formatterItem)
      }
      break
    }
  }
  obj.value = res ?? ''
  return obj
}

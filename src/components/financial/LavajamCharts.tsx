'use client';

import React, { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { PieChart, BarChart3, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface LavajamChartsProps {
  contributions: Array<{
    amount: number;
    fundType?: 'Lavajam' | 'Hoob';
    status: 'Paid' | 'Pending';
  }>;
  expenses: Array<{
    amount: number;
    expenseDetails: string;
    date?: string;
  }>;
}

export function LavajamCharts({ contributions = [], expenses = [] }: LavajamChartsProps) {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const isLight = theme === 'light';

  // Aggregate numbers
  const metrics = useMemo(() => {
    let lavajamTotal = 0;
    let hoobTotal = 0;
    let pendingTotal = 0;

    contributions.forEach(c => {
      const amt = Number(c.amount) || 0;
      if (c.status === 'Paid') {
        if (c.fundType === 'Hoob') {
          hoobTotal += amt;
        } else {
          lavajamTotal += amt;
        }
      } else {
        pendingTotal += amt;
      }
    });

    const expenseTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalCollected = lavajamTotal + hoobTotal;
    const netBalance = totalCollected - expenseTotal;

    return {
      lavajamTotal,
      hoobTotal,
      pendingTotal,
      expenseTotal,
      totalCollected,
      netBalance,
    };
  }, [contributions, expenses]);

  // Color tokens based on current theme
  const chartColors = useMemo(() => {
    return {
      background: 'transparent',
      textColor: isLight ? '#2E1609' : '#F5E6D3',
      subTextColor: isLight ? '#6D3A1D' : '#D1C2B7',
      gridLineColor: isLight ? 'rgba(180,83,9,0.12)' : 'rgba(255,255,255,0.08)',
      lavajam: '#10B981', // emerald
      hoob: '#F59E0B',    // amber
      expenses: '#EF4444',// rose / red
      balance: '#3B82F6', // blue
      pending: '#8B5CF6', // purple
    };
  }, [isLight]);

  // 1. Pie Chart Options
  const pieOptions: Highcharts.Options = useMemo(() => {
    return {
      chart: {
        type: 'pie',
        backgroundColor: chartColors.background,
        spacing: [15, 10, 15, 10],
        style: {
          fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
        },
      },
      title: {
        text: undefined,
      },
      tooltip: {
        backgroundColor: isLight ? '#F5E8CB' : '#1C0D06',
        borderColor: isLight ? '#D1BA8E' : '#D97736',
        borderRadius: 10,
        style: {
          color: chartColors.textColor,
          fontSize: '12px',
        },
        pointFormatter: function () {
          return `<span style="color:${this.color}">●</span> ${this.name}: <b>₹${Highcharts.numberFormat(this.y || 0, 0)}</b> (${Highcharts.numberFormat(this.percentage || 0, 1)}%)<br/>`;
        },
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          innerSize: '48%', // Donut style for modern aesthetics
          borderWidth: 2,
          borderColor: isLight ? '#FAF3E1' : '#180B04',
          dataLabels: {
            enabled: true,
            distance: -28,
            format: '{point.percentage:.0f}%',
            style: {
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              textOutline: 'none',
            },
            filter: {
              property: 'percentage',
              operator: '>',
              value: 4,
            },
          },
          showInLegend: true,
        },
      },
      legend: {
        itemStyle: {
          color: chartColors.textColor,
          fontSize: '11px',
          fontWeight: '500',
        },
        itemHoverStyle: {
          color: '#D97736',
        },
        layout: 'horizontal',
        align: 'center',
        verticalAlign: 'bottom',
      },
      credits: {
        enabled: false,
      },
      series: [
        {
          type: 'pie',
          name: 'Amount',
          data: [
            {
              name: 'Lavajam Dues',
              y: metrics.lavajamTotal,
              color: chartColors.lavajam,
              sliced: true,
              selected: true,
            },
            {
              name: 'Hoob Contributions',
              y: metrics.hoobTotal,
              color: chartColors.hoob,
            },
            {
              name: 'Instrument Expenses',
              y: metrics.expenseTotal,
              color: chartColors.expenses,
            },
          ],
        },
      ],
    };
  }, [metrics, chartColors, isLight]);

  // 2. Bar / Column Graph Options
  const barOptions: Highcharts.Options = useMemo(() => {
    return {
      chart: {
        type: 'column',
        backgroundColor: chartColors.background,
        spacing: [15, 10, 15, 10],
        style: {
          fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
        },
      },
      title: {
        text: undefined,
      },
      xAxis: {
        categories: ['Lavajam Dues', 'Hoob Donations', 'Total Inflow', 'Total Expenses', 'Net Balance'],
        labels: {
          style: {
            color: chartColors.textColor,
            fontSize: '10px',
            fontWeight: '600',
          },
        },
        lineColor: chartColors.gridLineColor,
        tickColor: chartColors.gridLineColor,
      },
      yAxis: {
        min: 0,
        title: {
          text: 'Amount (INR ₹)',
          style: {
            color: chartColors.subTextColor,
            fontSize: '10px',
          },
        },
        labels: {
          style: {
            color: chartColors.subTextColor,
            fontSize: '10px',
          },
          formatter: function () {
            return '₹' + (Number(this.value) >= 1000 ? Number(this.value) / 1000 + 'k' : this.value);
          },
        },
        gridLineColor: chartColors.gridLineColor,
      },
      tooltip: {
        backgroundColor: isLight ? '#F5E8CB' : '#1C0D06',
        borderColor: isLight ? '#D1BA8E' : '#D97736',
        borderRadius: 10,
        style: {
          color: chartColors.textColor,
          fontSize: '12px',
        },
        formatter: function () {
          return `<b>${this.x}</b><br/>Amount: <b>₹${Highcharts.numberFormat(Number(this.y) || 0, 0)}</b>`;
        },
      },
      plotOptions: {
        column: {
          borderRadius: 6,
          colorByPoint: true,
          dataLabels: {
            enabled: true,
            formatter: function () {
              return '₹' + Highcharts.numberFormat(Number(this.y) || 0, 0);
            },
            style: {
              color: chartColors.textColor,
              fontSize: '10px',
              fontWeight: 'bold',
              textOutline: 'none',
            },
          },
        },
      },
      legend: {
        enabled: false,
      },
      credits: {
        enabled: false,
      },
      series: [
        {
          type: 'column',
          name: 'Financial Ledger',
          data: [
            { y: metrics.lavajamTotal, color: chartColors.lavajam },
            { y: metrics.hoobTotal, color: chartColors.hoob },
            { y: metrics.totalCollected, color: '#059669' },
            { y: metrics.expenseTotal, color: chartColors.expenses },
            { y: Math.max(0, metrics.netBalance), color: chartColors.balance },
          ],
        },
      ],
    };
  }, [metrics, chartColors, isLight]);

  return (
    <div className="space-y-4">
      {/* Quick Visual Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Lavajam Collections
            </span>
            <span className="text-lg sm:text-xl font-bold font-serif text-foreground">
              {formatCurrency(metrics.lavajamTotal)}
            </span>
          </div>
          <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
        </div>

        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Hoob Donations
            </span>
            <span className="text-lg sm:text-xl font-bold font-serif text-foreground">
              {formatCurrency(metrics.hoobTotal)}
            </span>
          </div>
          <Wallet className="w-5 h-5 text-amber-500 shrink-0" />
        </div>

        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Instrument Expenses
            </span>
            <span className="text-lg sm:text-xl font-bold font-serif text-rose-500">
              {formatCurrency(metrics.expenseTotal)}
            </span>
          </div>
          <TrendingDown className="w-5 h-5 text-rose-500 shrink-0" />
        </div>

        <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Net Treasury Balance
            </span>
            <span className="text-lg sm:text-xl font-bold font-serif text-foreground">
              {formatCurrency(metrics.netBalance)}
            </span>
          </div>
          <Wallet className="w-5 h-5 text-blue-500 shrink-0" />
        </div>
      </div>

      {/* Highcharts Visualizations (Side-by-side or stacked on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart Card */}
        <Card className="border border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-500" />
                Fund Breakdown: Lavajam vs Hoob vs Expenses
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Proportional distribution of incoming contributions and instrument expenditures.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 min-h-[300px]">
            <HighchartsReact highcharts={Highcharts} options={pieOptions} />
          </CardContent>
        </Card>

        {/* Bar Graph Card */}
        <Card className="border border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                Financial Comparison: Inflow vs Expenses
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Direct comparison of contributions, cumulative inflow, total expenses, and balance.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 min-h-[300px]">
            <HighchartsReact highcharts={Highcharts} options={barOptions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

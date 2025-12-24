import React, { useState, useMemo } from "react";
import {
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector
} from "recharts";

interface FinancialRecord {
  id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
}

interface ChartProps {
  financialRecords?: FinancialRecord[];
  lang?: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"];

// Helper function to aggregate data by month
const aggregateByMonth = (records: FinancialRecord[]) => {
  const monthlyData: Record<string, { income: number; expenses: number }> = {};
  
  records.forEach(record => {
    const date = new Date(record.date);
    const monthKey = date.toLocaleString('en-US', { month: 'short' });
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    
    if (record.type === 'income') {
      monthlyData[monthKey].income += Number(record.amount);
    } else {
      monthlyData[monthKey].expenses += Number(record.amount);
    }
  });
  
  return Object.entries(monthlyData).map(([name, data]) => ({
    name,
    income: data.income,
    expenses: data.expenses
  }));
};

// Helper function to aggregate data by week for revenue growth
const aggregateByWeek = (records: FinancialRecord[]) => {
  const weeklyData: Record<string, number> = {};
  
  const incomeRecords = records.filter(r => r.type === 'income');
  
  incomeRecords.forEach((record, index) => {
    const weekNum = Math.floor(index / 7) + 1;
    const weekKey = `Week ${weekNum}`;
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = 0;
    }
    
    weeklyData[weekKey] += Number(record.amount);
  });
  
  // If we have no data, return some weeks with 0 revenue
  if (Object.keys(weeklyData).length === 0) {
    return [
      { name: "Week 1", revenue: 0 },
      { name: "Week 2", revenue: 0 },
      { name: "Week 3", revenue: 0 },
      { name: "Week 4", revenue: 0 },
    ];
  }
  
  return Object.entries(weeklyData).map(([name, revenue]) => ({
    name,
    revenue
  }));
};

// Helper function to aggregate expenses by category
const aggregateByCategory = (records: FinancialRecord[]) => {
  const categoryData: Record<string, number> = {};
  
  const expenseRecords = records.filter(r => r.type === 'expense');
  
  expenseRecords.forEach(record => {
    const category = record.category || 'Other';
    if (!categoryData[category]) {
      categoryData[category] = 0;
    }
    categoryData[category] += Number(record.amount);
  });
  
  // If no data, show empty state
  if (Object.keys(categoryData).length === 0) {
    return [{ name: "No expenses", value: 100 }];
  }
  
  const total = Object.values(categoryData).reduce((sum, val) => sum + val, 0);
  
  return Object.entries(categoryData).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round((value / total) * 100)
  }));
};

export function BarChart({ financialRecords = [], lang = 'en' }: ChartProps) {
  const chartData = useMemo(() => {
    if (financialRecords.length === 0) {
      return [
        { name: "No data", income: 0, expenses: 0 }
      ];
    }
    return aggregateByMonth(financialRecords);
  }, [financialRecords]);

  const currencySymbol = lang === 'el' ? '€' : '$';

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value) => [`${currencySymbol}${value}`, undefined]}
            labelStyle={{ color: "#333" }}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          />
          <Legend />
          <Bar dataKey="income" fill="#0F56B3" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="expenses" fill="#FF8042" radius={[4, 4, 0, 0]} barSize={20} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineChart({ financialRecords = [], lang = 'en' }: ChartProps) {
  const chartData = useMemo(() => {
    return aggregateByWeek(financialRecords);
  }, [financialRecords]);

  const currencySymbol = lang === 'el' ? '€' : '$';

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value) => [`${currencySymbol}${value}`, "Revenue"]}
            labelStyle={{ color: "#333" }}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#0F56B3"
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Custom label renderer for the pie chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.1;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return (
    <text 
      x={x} 
      y={y} 
      fill="#333"
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="12px"
      fontWeight="500"
    >
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

// Active shape for the pie chart when hovering
const renderActiveShape = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-midAngle * Math.PI / 180);
  const cos = Math.cos(-midAngle * Math.PI / 180);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" fontSize={12}>
        {`${payload.name}: ${value}%`}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" fontSize={11}>
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

export function PieChart({ financialRecords = [] }: ChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const chartData = useMemo(() => {
    return aggregateByCategory(financialRecords);
  }, [financialRecords]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            fill="#8884d8"
            dataKey="value"
            onMouseEnter={onPieEnter}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend 
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: '12px', paddingLeft: '10px' }}
          />
          <Tooltip 
            formatter={(value) => [`${value}%`, undefined]}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              fontSize: '12px'
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

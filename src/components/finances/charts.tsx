
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
  ResponsiveContainer
} from "recharts";

// Sample data for charts
const barData = [
  { name: "Jan", income: 4000, expenses: 2400 },
  { name: "Feb", income: 3000, expenses: 1398 },
  { name: "Mar", income: 2000, expenses: 3800 },
  { name: "Apr", income: 2780, expenses: 3908 },
  { name: "May", income: 1890, expenses: 4800 },
  { name: "Jun", income: 2390, expenses: 3800 },
  { name: "Jul", income: 3490, expenses: 4300 },
];

const lineData = [
  { name: "Week 1", revenue: 4000 },
  { name: "Week 2", revenue: 3000 },
  { name: "Week 3", revenue: 5000 },
  { name: "Week 4", revenue: 2780 },
  { name: "Week 5", revenue: 3890 },
  { name: "Week 6", revenue: 3390 },
  { name: "Week 7", revenue: 4490 },
];

const pieData = [
  { name: "Fuel", value: 35 },
  { name: "Maintenance", value: 25 },
  { name: "Insurance", value: 20 },
  { name: "Registration", value: 10 },
  { name: "Other", value: 10 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function BarChart() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={barData}
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
            formatter={(value) => [`$${value}`, undefined]}
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

export function LineChart() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={lineData}
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
            formatter={(value) => [`$${value}`, "Revenue"]}
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

export function PieChart() {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value}%`, undefined]}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

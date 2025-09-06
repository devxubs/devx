const orderStatuses = [
  "Pending", // Order placed but not yet processed
  "Confirmed", // Seller confirmed the order
  "Processing", // Order is being prepared
  "Shipped", // Order handed to courier  ----in courier
  "Out for Delivery", // Courier is delivering
  "Delivered", // Successfully delivered
  "Completed", // Successfully completed
  "Cancelled", // Cancelled before shipping
  "Failed", // Payment/order failed
];

const districts = [
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barisal",
  "Bhola",
  "Bogra",
  "Brahmanbaria",
  "Chandpur",
  "Chapai Nawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokati",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
];

const products = [
  "Wireless Bluetooth Earbuds",
  "Smart Watch",
  "Wooden Study Table",
  "Men's Cotton T-Shirt",
  "Non-stick Frying Pan",
  "Baby Stroller",
];
const orderSources = [
  "Website",
  "Mobile App",
  "Facebook",
  "Instagram",
  "WhatsApp",
  "Phone Call",
  "Physical Store",
  "Affiliate",
  "Marketplace",
  "Other",
];

export { orderStatuses, products, districts, orderSources };
